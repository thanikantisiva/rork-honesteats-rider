import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { displayNotificationFromRemoteMessage, ensureNotificationChannel } from './services/firebase-messaging';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('FCM notification received in background (rider):', remoteMessage);

  await ensureNotificationChannel();

  // Notification payloads are shown by the OS in background/quit. Only
  // synthesize a local notification when Firebase delivers data-only content.
  if (!remoteMessage?.notification) {
    await displayNotificationFromRemoteMessage(remoteMessage);
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('Notifee background event (rider):', type, detail?.notification?.data);
});

import 'expo-router/entry';
