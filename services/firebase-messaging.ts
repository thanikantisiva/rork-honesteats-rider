/**
 * Firebase Cloud Messaging for Rider App
 * Handles push notifications
 */

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, PermissionsAndroid, Platform } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { userAPI } from '@/lib/api';
import { startRiderRideAlert, stopRiderRideAlert } from './rider-floating-service';

/**
 * Bump this suffix (`_v4`, `_v5`...) any time the channel sound, importance,
 * or vibration pattern changes. Android 8+ notification channels are
 * IMMUTABLE — a `createChannel` call on an existing id is a no-op for those
 * settings, so the only way to ship new behaviour is a fresh id. On
 * creation we also delete older ids so they don't show up in the system
 * notification settings as duplicates.
 *
 * `_v4` deliberately has NO `sound` set on the channel: the native bubble
 * service (`RiderFloatingService` in the `:location` process) owns audio
 * playback through a looping `MediaPlayer`. A channel with its own sound
 * would override `FLAG_INSISTENT` on Android 8+, leaving us with a single
 * one-shot chime instead of a persistent ring.
 */
export const RIDER_NOTIFICATION_CHANNEL_ID = 'rider_orders_ring_v4';
const LEGACY_RIDER_NOTIFICATION_CHANNEL_IDS = [
  'rider_orders_ring',
  'rider_orders_ring_v2',
  'rider_orders_ring_v3',
];
/**
 * Android: res/raw/new_order_ring.wav (sync from assets/sounds/new-order-ring.wav).
 * iOS: HonestEatsRider/new_order_ring.wav in Xcode bundle — name without extension for Notifee.
 */
export const RIDER_NOTIFICATION_SOUND = 'new_order_ring';
/** Secondary channel; same custom ring as main (all rider pushes use new-order-ring.wav). */
export const RIDER_ORDER_UPDATES_CHANNEL_ID = 'rider_order_updates';

const DEFAULT_NOTIFICATION_TITLE = 'YumDude Rider';
const DEFAULT_NOTIFICATION_BODY = 'You have a new update';

/** Same asset as app.json "icon" — used for notification large icon / iOS thumbnail. */
const RIDER_APP_ICON = require('../assets/images/icon.png');
const RIDE_ALERT_STATUSES = new Set(['OFFERED_TO_RIDER', 'RIDER_ASSIGNED']);

export async function ensureNotificationChannel(): Promise<string> {
  if (Platform.OS === 'ios') {
    // Register notification categories so iOS shows Accept / Reject action buttons
    await notifee.setNotificationCategories([
      {
        id: 'ORDER_ASSIGNED',
        actions: [
          { id: 'ACCEPT_ORDER', title: '\u2705 Accept', foreground: true },
          { id: 'REJECT_ORDER', title: '\u274C Reject', foreground: true, destructive: true },
        ],
      },
    ]);
    return RIDER_NOTIFICATION_CHANNEL_ID;
  }

  // Drop any legacy channels left over from earlier app versions so they
  // don't surface in system Settings → Notifications as silent duplicates.
  for (const legacyId of LEGACY_RIDER_NOTIFICATION_CHANNEL_IDS) {
    try {
      await notifee.deleteChannel(legacyId);
    } catch {
      // Channel didn't exist — fine.
    }
  }

  // NOTE: no `sound` here on purpose. The native :location process plays
  // and loops `new_order_ring` via MediaPlayer; setting a channel sound
  // would cause Android to fire its own one-shot chime that fights with
  // (and silences) the looping ring on Android 8+.
  return notifee.createChannel({
    id: RIDER_NOTIFICATION_CHANNEL_ID,
    name: 'Rider Orders',
    description: 'High-priority alerts when a delivery is offered or confirmed',
    importance: AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    lights: true,
  });
}

export async function ensureOrderUpdatesChannel(): Promise<string> {
  if (Platform.OS === 'ios') {
    return RIDER_NOTIFICATION_CHANNEL_ID;
  }
  return notifee.createChannel({
    id: RIDER_ORDER_UPDATES_CHANNEL_ID,
    name: 'Order updates',
    description: 'Rider order updates',
    importance: AndroidImportance.HIGH,
    sound: RIDER_NOTIFICATION_SOUND,
    vibration: true,
  });
}

async function resolveRiderNotificationChannel(data: Record<string, string>): Promise<string> {
  // order_accepted: same high-priority channel + custom ring as order_assigned
  if (data.type === 'order_accepted') {
    return ensureNotificationChannel();
  }
  if (data.channelId === RIDER_ORDER_UPDATES_CHANNEL_ID) {
    return ensureOrderUpdatesChannel();
  }
  return ensureNotificationChannel();
}

function normalizeNotificationData(data: any): Record<string, string> {
  if (!data || typeof data !== 'object') {
    return {};
  }

  return Object.entries(data).reduce<Record<string, string>>((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }

    acc[key] = String(value);
    return acc;
  }, {});
}

function shouldStartRideAlert(data: Record<string, any>): boolean {
  const type = String(data.type ?? '');
  if (type !== 'order_assigned' && type !== 'order_accepted') {
    return false;
  }

  // If backend sends the concrete order status, only ring for statuses that
  // need rider attention. Older payloads may omit status; keep those alertable
  // and let the native per-order dedupe suppress accepted-transition repeats.
  const status = data.status ?? data.orderStatus;
  return !status || RIDE_ALERT_STATUSES.has(String(status).toUpperCase());
}

function isRiderAlertNotificationType(type: unknown): boolean {
  return type === 'order_assigned' || type === 'order_accepted';
}

function getNotificationTitle(remoteMessage: any): string {
  return (
    remoteMessage?.notification?.title ||
    remoteMessage?.data?.title ||
    DEFAULT_NOTIFICATION_TITLE
  );
}

function getNotificationBody(remoteMessage: any): string {
  return (
    remoteMessage?.notification?.body ||
    remoteMessage?.data?.body ||
    remoteMessage?.data?.message ||
    DEFAULT_NOTIFICATION_BODY
  );
}

function toOpenedMessage(notification: any) {
  if (!notification) return null;

  return {
    data: notification.data || {},
    notification: {
      title: notification.title,
      body: notification.body,
    },
  };
}

/** Stop Android looping notification sounds (Notifee ongoing + loopSound) for rider order pushes. */
export async function cancelRiderLoopingPushNotifications(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  try {
    const displayed = await notifee.getDisplayedNotifications();
    for (const entry of displayed) {
      const t = entry.notification?.data?.type;
      if (isRiderAlertNotificationType(t)) {
        const nid = entry.id;
        if (nid) {
          await notifee.cancelDisplayedNotification(nid);
        }
      }
    }
  } catch (e) {
    console.warn('cancelRiderLoopingPushNotifications:', e);
  }
}

export async function displayNotificationFromRemoteMessage(remoteMessage: any): Promise<void> {
  const title = getNotificationTitle(remoteMessage);
  const body = getNotificationBody(remoteMessage);
  const data = normalizeNotificationData(remoteMessage?.data);

  if (!title && !body) {
    return;
  }

  const channelId = await resolveRiderNotificationChannel(data);
  const isOrderAssigned = data.type === 'order_assigned';
  const isOrderAccepted = data.type === 'order_accepted';
  // The Notifee notification is a *visual* sticky entry only; persistent
  // audio is owned by the native :location service (MediaPlayer + Vibrator).
  // We keep `ongoing` so the rider can't accidentally swipe the offer away.
  const isPersistentRiderAlert = isOrderAssigned || isOrderAccepted;
  const notificationId = data.orderId
    ? `rider-push-${data.orderId}`
    : `rider-push-${data.type || 'order'}`;

  // Notifee validates ios.categoryId — omit property when unset (undefined throws on iOS).
  const ios: {
    sound: string;
    categoryId?: string;
    attachments?: { id: string; url: string; typeHint: string }[];
  } = {
    sound: RIDER_NOTIFICATION_SOUND,
  };
  if (isOrderAssigned) {
    ios.categoryId = 'ORDER_ASSIGNED';
  }
  if (Platform.OS === 'ios') {
    try {
      const src = Image.resolveAssetSource(RIDER_APP_ICON);
      if (src?.uri) {
        ios.attachments = [
          { id: 'rider-app-icon', url: src.uri, typeHint: 'public.png' },
        ];
      }
    } catch {
      // ignore — notification still shows without thumbnail
    }
  }

  await notifee.displayNotification({
    id: notificationId,
    title,
    body,
    data,
    android: {
      channelId,
      pressAction: {
        id: 'default',
        launchActivity: 'default',
      },
      // Accept / Reject buttons inline in the notification shade
      actions: isOrderAssigned
        ? [
            {
              title: '\u2705 Accept',
              pressAction: { id: 'ACCEPT_ORDER', launchActivity: 'default' },
            },
            {
              title: '\u274C Reject',
              pressAction: { id: 'REJECT_ORDER', launchActivity: 'default' },
            },
          ]
        : undefined,
      // drawable/ic_rider_notification_small.xml → @mipmap/ic_launcher_foreground (matches adaptive icon art)
      smallIcon: 'ic_rider_notification_small',
      largeIcon: RIDER_APP_ICON,
      circularLargeIcon: true,
      color: '#FF6B35',
      // No `sound` / `loopSound` here on purpose — the channel has no sound
      // either. The native bubble service plays the looping ring; setting
      // a per-notification sound would either be ignored (Android 8+ uses
      // channel sound only) or fire a one-shot chime that competes with
      // the MediaPlayer loop.
      importance: AndroidImportance.HIGH,
      ongoing: isPersistentRiderAlert,
    },
    ios,
  });
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    console.log('🔔 Requesting notification permission...');
    
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('⚠️ Android notification permission denied');
          return false;
        }
      }

      await ensureNotificationChannel();

      console.log('✅ Android notification permission granted');
      return true;
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      await notifee.requestPermission();
      console.log('✅ iOS notification permission granted:', authStatus);
    } else {
      console.log('❌ iOS notification permission denied');
    }
    return enabled;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get FCM device token
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    console.log('🔄 Requesting FCM token from Firebase SDK...');
    console.log('📱 This generates a UNIQUE token for THIS DEVICE');
    
    // Get FCM token - This is DEVICE-SPECIFIC and changes if app is reinstalled
    const token = await messaging().getToken();
    
    if (token) {
      console.log('✅ Got NEW FCM token for THIS device:', token.substring(0, 30) + '...');
      console.log('📏 Token length:', token.length);
      console.log('🔑 This token is UNIQUE to this device and will replace any old token');
      return token;
    } else {
      console.warn('⚠️ No FCM token available');
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error getting FCM token:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    return null;
  }
}

/**
 * Request notification permission, read the current FCM token, and POST it to the backend.
 * Call when the rider goes online (and on session restore while online) so every session
 * stores the latest token after reinstall, data clear, or Firebase rotation.
 */
export async function syncRiderFcmTokenToBackend(phone: string): Promise<void> {
  const trimmed = (phone || '').trim();
  if (!trimmed) {
    console.warn('⚠️ syncRiderFcmTokenToBackend: missing phone');
    return;
  }
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('⚠️ Notification permission not granted — FCM sync skipped');
      return;
    }
    await ensureNotificationChannel();
    const fcmToken = await getFCMToken();
    if (!fcmToken) {
      console.warn('⚠️ No FCM token — sync skipped');
      return;
    }
    await userAPI.registerFCMToken(trimmed, fcmToken);
    console.log('✅ FCM token synced to backend for rider');
  } catch (error) {
    console.error('Failed to sync FCM token to backend:', error);
  }
}

/**
 * Subscribe to a topic
 */
export async function subscribeToTopic(topic: string): Promise<void> {
  try {
    console.log(`📬 Subscribing to topic: ${topic}`);
    await messaging().subscribeToTopic(topic);
    console.log(`✅ Subscribed to topic: ${topic}`);
  } catch (error) {
    console.error(`❌ Error subscribing to topic ${topic}:`, error);
  }
}

/**
 * Unsubscribe from a topic
 */
export async function unsubscribeFromTopic(topic: string): Promise<void> {
  try {
    console.log(`📪 Unsubscribing from topic: ${topic}`);
    await messaging().unsubscribeFromTopic(topic);
    console.log(`✅ Unsubscribed from topic: ${topic}`);
  } catch (error) {
    console.error(`❌ Error unsubscribing from topic ${topic}:`, error);
  }
}

/**
 * Setup notification listeners
 * Returns cleanup function
 */
/**
 * Re-register FCM token with backend when Firebase rotates it (avoids silent push loss).
 */
export function setupFCMTokenRefreshListener(): () => void {
  return messaging().onTokenRefresh(async (newToken) => {
    try {
      const phone = await AsyncStorage.getItem('@rider_phone');
      if (!phone || !newToken) {
        return;
      }
      await userAPI.registerFCMToken(phone, newToken);
      console.log('✅ Refreshed FCM token registered with backend');
    } catch (error) {
      console.error('Failed to register refreshed FCM token:', error);
    }
  });
}

export function setupNotificationListeners(
  onNotificationReceived: (message: any) => void,
  onNotificationOpened: (message: any) => void,
  onActionPress?: (actionId: string, data: Record<string, string>) => void
): () => void {
  console.log('🔔 Setting up notification listeners for rider app...');
  void ensureNotificationChannel();

  // Foreground notification handler
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    console.log('📬 FCM notification received (foreground - rider):', remoteMessage);

    // Kick the native looping ring through the :location process so we get
    // the same persistent alert behaviour in foreground as we do when killed.
    // The bubble owns audio/vibration; the channel sound here only chimes
    // once for the heads-up animation.
    const data = remoteMessage?.data ?? {};
    if (shouldStartRideAlert(data) && data.orderId) {
      startRiderRideAlert(
        String(data.orderId),
        String(data.restaurantName || 'a nearby restaurant'),
        Number(data.deliveryFee) || 0,
      );
    }

    await displayNotificationFromRemoteMessage(remoteMessage);
    onNotificationReceived(remoteMessage);
  });

  // Background notification opened handler
  const unsubscribeBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('👆 FCM notification opened from background (rider):', remoteMessage);
    onNotificationOpened(remoteMessage);
  });

  // App opened from quit state
  messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log('🚀 App opened from quit state by notification (rider):', remoteMessage);
        onNotificationOpened(remoteMessage);
      }
    });

  const unsubscribeNotifeeForeground = notifee.onForegroundEvent(({ type, detail }) => {
    const data = (detail.notification?.data ?? {}) as Record<string, string>;

    // ACTION_PRESS — Accept / Reject button tapped while app is in foreground
    if (type === EventType.ACTION_PRESS && detail.pressAction?.id !== 'default') {
      const actionId = detail.pressAction!.id;
      console.log(`👆 Notification action pressed (foreground): ${actionId}`, data);
      // Stop the loop the moment the rider commits — this is parity with the
      // background path in index.js so the ring never outlives the tap.
      if (data.orderId) stopRiderRideAlert(String(data.orderId));
      if (onActionPress) {
        onActionPress(actionId, data);
      }
      return;
    }

    if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) {
      return;
    }

    if (type === EventType.PRESS && data.orderId) {
      stopRiderRideAlert(String(data.orderId));
    }

    const openedMessage = toOpenedMessage(detail.notification);
    if (openedMessage) {
      console.log('👆 Local notification opened in foreground (rider):', openedMessage);
      onNotificationOpened(openedMessage);
    }
  });

  console.log('✅ Notification listeners setup complete');

  // Return cleanup function
  return () => {
    console.log('🧹 Cleaning up notification listeners');
    unsubscribeForeground();
    unsubscribeBackground();
    unsubscribeNotifeeForeground();
  };
}

/**
 * Parse notification data
 */
export function parseNotificationData(data: any) {
  if (!data) return null;
  
  return {
    type: data.type,
    orderId: data.orderId || data.order_id,
    riderId: data.riderId || data.rider_id,
    message: data.message,
  };
}

/**
 * Get last notification that opened the app
 */
export async function getLastNotificationResponse() {
  try {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      return remoteMessage;
    }

    const initialNotification = await notifee.getInitialNotification();
    return toOpenedMessage(initialNotification?.notification);
  } catch (error) {
    console.error('❌ Error getting initial notification:', error);
    return null;
  }
}
