import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { displayNotificationFromRemoteMessage, ensureNotificationChannel } from './services/firebase-messaging';
import { startRiderRideAlert, stopRiderRideAlert } from './services/rider-floating-service';

// IMPORTANT: Import task definition BEFORE expo-router so TaskManager.defineTask
// is registered in every JS context — including the headless background context
// created by the OS when it wakes the app to deliver location updates.
import './tasks/background-location';

const RIDE_ALERT_TYPES = new Set(['order_assigned', 'order_accepted']);
const RIDE_ALERT_STATUSES = new Set(['OFFERED_TO_RIDER', 'RIDER_ASSIGNED']);

function shouldStartRideAlert(data) {
  if (!data?.type || !RIDE_ALERT_TYPES.has(String(data.type))) {
    return false;
  }

  // Older push payloads may not include status. Keep those alertable and let
  // the native service's per-order "already alerted" set suppress duplicates.
  const status = data.status || data.orderStatus;
  return !status || RIDE_ALERT_STATUSES.has(String(status).toUpperCase());
}

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('FCM notification received in background (rider):', remoteMessage);

  await ensureNotificationChannel();

  // Fire the looping ring + sticky notification through the native
  // :location process FIRST. This works even when the JS main process is
  // about to die — the bubble service is in a separate process and owns
  // its own MediaPlayer + Vibrator. Without this, Android 8+ would just
  // play the channel sound once and stop (FLAG_INSISTENT is a no-op when
  // the channel itself owns the sound).
  const data = remoteMessage?.data ?? {};
  if (shouldStartRideAlert(data) && data.orderId) {
    startRiderRideAlert(
      String(data.orderId),
      String(data.restaurantName || 'a nearby restaurant'),
      Number(data.deliveryFee) || 0,
    );
  }

  // Notification payloads are shown by the OS in background/quit. Only
  // synthesize a local notification when Firebase delivers data-only content.
  if (!remoteMessage?.notification) {
    await displayNotificationFromRemoteMessage(remoteMessage);
  }
});

// ---------------------------------------------------------------------------
// Background notifee handler
// Handles Accept / Reject action button taps when app is in background/killed.
// The action is executed immediately so the rider doesn't have to wait for
// the app to fully boot before the order is accepted / rejected.
// ---------------------------------------------------------------------------

async function resolveApiBaseUrlForBg() {
  try {
    const phone = await AsyncStorage.getItem('@rider_phone');
    if (!phone) return 'https://api.yumdude.com';
    const mockPrefixes = ['+1555', '+15550', '9999', '1234567890'];
    const isMock = mockPrefixes.some((p) => phone.startsWith(p));
    return isMock ? 'https://api.dev.yumdude.com' : 'https://api.yumdude.com';
  } catch {
    return 'https://api.yumdude.com';
  }
}

notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('Notifee background event (rider):', type, detail?.notification?.data);

  const data = detail?.notification?.data ?? {};

  // Tapping the notification body (default action) should silence the ring
  // immediately — the rider has clearly seen the offer. The launcher intent
  // also opens the app, which will independently call stopRiderRideAlert(null)
  // on AppState=active.
  if (type === EventType.PRESS) {
    if (data.orderId) stopRiderRideAlert(String(data.orderId));
    return;
  }

  if (type !== EventType.ACTION_PRESS) return;

  const actionId = detail.pressAction?.id;
  if (!actionId || actionId === 'default') return;

  const orderId = data.orderId;
  if (!orderId) return;

  // Stop the loop the instant the rider commits — don't wait for the HTTP
  // round-trip below.
  stopRiderRideAlert(String(orderId));

  try {
    const [riderId, token, baseUrl] = await Promise.all([
      AsyncStorage.getItem('@rider_id'),
      AsyncStorage.getItem('@jwt_token'),
      resolveApiBaseUrlForBg(),
    ]);

    if (!riderId || !token) {
      console.warn('[BG Notifee] No credentials — skipping action');
      return;
    }

    if (actionId === 'ACCEPT_ORDER') {
      console.log(`[BG Notifee] Accepting order ${orderId}`);
      await fetch(
        `${baseUrl}/api/v1/riders/${riderId}/orders/${orderId}/accept/RIDER_ASSIGNED`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        }
      );
    } else if (actionId === 'REJECT_ORDER') {
      console.log(`[BG Notifee] Rejecting order ${orderId}`);
      await fetch(`${baseUrl}/api/v1/riders/${riderId}/orders/${orderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: 'declined_via_notification' }),
      });
    }

    // Dismiss the notification after the action is handled
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
  } catch (err) {
    console.error('[BG Notifee] Action handler failed:', err);
  }
});

import 'expo-router/entry';
