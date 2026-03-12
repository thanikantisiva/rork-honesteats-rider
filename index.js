import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('FCM notification received in background (rider):', remoteMessage);
});

import 'expo-router/entry';
