/**
 * Firebase Cloud Messaging for Rider App
 * Handles push notifications
 */

import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

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

      console.log('✅ Android notification permission granted');
      return true;
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
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
export function setupNotificationListeners(
  onNotificationReceived: (message: any) => void,
  onNotificationOpened: (message: any) => void
): () => void {
  console.log('🔔 Setting up notification listeners for rider app...');

  // Foreground notification handler
  const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
    console.log('📬 FCM notification received (foreground - rider):', remoteMessage);
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

  console.log('✅ Notification listeners setup complete');

  // Return cleanup function
  return () => {
    console.log('🧹 Cleaning up notification listeners');
    unsubscribeForeground();
    unsubscribeBackground();
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
    return remoteMessage;
  } catch (error) {
    console.error('❌ Error getting initial notification:', error);
    return null;
  }
}
