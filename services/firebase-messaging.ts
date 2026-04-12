/**
 * Firebase Cloud Messaging for Rider App
 * Handles push notifications
 */

import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { userAPI } from '@/lib/api';

export const RIDER_NOTIFICATION_CHANNEL_ID = 'rider_orders_ring_v2';
export const RIDER_NOTIFICATION_SOUND = 'new_order_ring';

const DEFAULT_NOTIFICATION_TITLE = 'YumDude Rider';
const DEFAULT_NOTIFICATION_BODY = 'You have a new update';

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

  return notifee.createChannel({
    id: RIDER_NOTIFICATION_CHANNEL_ID,
    name: 'Rider Orders',
    description: 'Order alerts and rider updates',
    importance: AndroidImportance.HIGH,
    sound: RIDER_NOTIFICATION_SOUND,
    vibration: true,
  });
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

export async function displayNotificationFromRemoteMessage(remoteMessage: any): Promise<void> {
  const title = getNotificationTitle(remoteMessage);
  const body = getNotificationBody(remoteMessage);
  const data = normalizeNotificationData(remoteMessage?.data);

  if (!title && !body) {
    return;
  }

  const channelId = await ensureNotificationChannel();
  const isOrderAssigned = data.type === 'order_assigned';

  await notifee.displayNotification({
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
      smallIcon: 'ic_launcher',
      sound: RIDER_NOTIFICATION_SOUND,
      importance: AndroidImportance.HIGH,
    },
    ios: {
      sound: isOrderAssigned ? RIDER_NOTIFICATION_SOUND : 'default',
      categoryId: isOrderAssigned ? 'ORDER_ASSIGNED' : undefined,
    },
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
    // ACTION_PRESS — Accept / Reject button tapped while app is in foreground
    if (type === EventType.ACTION_PRESS && detail.pressAction?.id !== 'default') {
      const actionId = detail.pressAction!.id;
      const data = (detail.notification?.data ?? {}) as Record<string, string>;
      console.log(`👆 Notification action pressed (foreground): ${actionId}`, data);
      if (onActionPress) {
        onActionPress(actionId, data);
      }
      return;
    }

    if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) {
      return;
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
