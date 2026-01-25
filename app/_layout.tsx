/**
 * Root Layout for Rider App
 */

import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OrdersProvider } from '@/contexts/OrdersContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { setupNotificationListeners, parseNotificationData, getLastNotificationResponse } from '@/services/firebase-messaging';
import { useThemedAlert } from '@/components/ThemedAlert';
import firebaseApp from '@react-native-firebase/app';
import appCheck from '@react-native-firebase/app-check';

SplashScreen.preventAutoHideAsync();

// Initialize Firebase App Check with Play Integrity (v23+ API)
// This enables invisible device attestation - eliminates reCAPTCHA/Chrome tab
const initializeFirebaseAppCheck = async () => {
  try {
    console.log('🔧 Initializing Firebase App Check with Play Integrity (Rider App)...');
    
    // Create provider using v23+ API
    const rnfbProvider = appCheck().newReactNativeFirebaseAppCheckProvider();
    rnfbProvider.configure({
      android: {
        provider: 'playIntegrity',
      },
      apple: {
        provider: 'deviceCheck',
      },
    });
    
    // Initialize with the provider
    await appCheck().initializeAppCheck({ 
      provider: rnfbProvider,
      isTokenAutoRefreshEnabled: true 
    });
    
    console.log('✅ App Check initialized with Play Integrity! (Rider App)');
    console.log('✅ Chrome tab eliminated - using device attestation');
  } catch (error: any) {
    console.error('❌ App Check init failed (Rider App):', error.message);
    console.error('❌ Error code:', error.code);
    console.warn('⚠️ Will fallback to reCAPTCHA automatically');
  }
};

// Initialize App Check on app start
initializeFirebaseAppCheck();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoggedIn, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { showAlert, AlertComponent } = useThemedAlert();

  // Setup Firebase FCM notification listeners
  useEffect(() => {
    const handleNotificationReceived = (remoteMessage: any) => {
      console.log('📬 FCM notification received (foreground - rider):', remoteMessage);
      const data = parseNotificationData(remoteMessage.data);
      
      if (data) {
        showAlert(
          remoteMessage.notification?.title || 'New Notification',
          remoteMessage.notification?.body || data.message || 'You have a new update'
        );
      }
    };

    const handleNotificationOpened = (remoteMessage: any) => {
      console.log('👆 FCM notification opened (rider):', remoteMessage);
      const data = parseNotificationData(remoteMessage.data);
      
      if (data && data.orderId) {
        console.log('📍 Navigating to order:', data.orderId);
        router.push(`/order-details?orderId=${data.orderId}` as any);
      }
    };

    // Check if app was opened by tapping a notification
    getLastNotificationResponse().then((remoteMessage) => {
      if (remoteMessage) {
        console.log('🚀 App opened from FCM notification (rider):', remoteMessage);
        handleNotificationOpened(remoteMessage);
      }
    });

    const unsubscribe = setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationOpened
    );

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)' || ['welcome', 'login', 'signup', 'verification-pending'].includes(segments[0]);

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/welcome');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, isLoading, segments]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <>
      <Stack>
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="verification-pending" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order-details" options={{ headerShown: true, title: 'Order Details' }} />
      </Stack>
      <AlertComponent />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LocationProvider>
            <OrdersProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <RootLayoutNav />
              </GestureHandlerRootView>
            </OrdersProvider>
          </LocationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
