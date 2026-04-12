import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { displayNotificationFromRemoteMessage, ensureNotificationChannel } from './services/firebase-messaging';

// IMPORTANT: Import task definition BEFORE expo-router so TaskManager.defineTask
// is registered in every JS context — including the headless background context
// created by the OS when it wakes the app to deliver location updates.
import './tasks/background-location';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('FCM notification received in background (rider):', remoteMessage);

  await ensureNotificationChannel();

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

  if (type !== EventType.ACTION_PRESS) return;

  const actionId = detail.pressAction?.id;
  if (!actionId || actionId === 'default') return;

  const data = detail.notification?.data ?? {};
  const orderId = data.orderId;
  if (!orderId) return;

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
        `${baseUrl}/api/v1/riders/${riderId}/orders/${orderId}/accept/OFFERED_TO_RIDER`,
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
