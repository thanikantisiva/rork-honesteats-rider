/**
 * Root Layout for Rider App
 */

import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OrdersProvider } from '@/contexts/OrdersContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { setupNotificationListeners, parseNotificationData, getLastNotificationResponse } from '@/services/firebase-messaging';
import { useThemedAlert } from '@/components/ThemedAlert';
import { StartupSplash } from '@/components/StartupSplash';
import { riderTheme } from '@/theme/riderTheme';
import appCheck from '@react-native-firebase/app-check';

SplashScreen.preventAutoHideAsync();

const initializeFirebaseAppCheck = async () => {
  try {
    console.log('Initializing Firebase App Check with Play Integrity (Rider App)...');

    const rnfbProvider = appCheck().newReactNativeFirebaseAppCheckProvider();
    rnfbProvider.configure({
      android: {
        provider: 'playIntegrity',
      },
      apple: {
        provider: 'deviceCheck',
      },
    });

    await appCheck().initializeAppCheck({
      provider: rnfbProvider,
      isTokenAutoRefreshEnabled: true,
    });

    console.log('App Check initialized with Play Integrity! (Rider App)');
  } catch (error: any) {
    console.error('App Check init failed (Rider App):', error.message);
    console.error('Error code:', error.code);
    console.warn('Will fallback to reCAPTCHA automatically');
  }
};

initializeFirebaseAppCheck();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoggedIn, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { showAlert, AlertComponent } = useThemedAlert();
  const [showStartupSplash, setShowStartupSplash] = useState(true);

  useEffect(() => {
    const handleNotificationReceived = (remoteMessage: any) => {
      console.log('FCM notification received (foreground - rider):', remoteMessage);
      const data = parseNotificationData(remoteMessage.data);

      if (data) {
        showAlert(
          remoteMessage.notification?.title || 'New Notification',
          remoteMessage.notification?.body || data.message || 'You have a new update'
        );
      }
    };

    const handleNotificationOpened = (remoteMessage: any) => {
      console.log('FCM notification opened (rider):', remoteMessage);
      const data = parseNotificationData(remoteMessage.data);

      if (data && data.orderId) {
        console.log('Navigating to order:', data.orderId);
        router.push(`/order-details?orderId=${data.orderId}` as any);
      }
    };

    getLastNotificationResponse().then((remoteMessage) => {
      if (remoteMessage) {
        console.log('App opened from FCM notification (rider):', remoteMessage);
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

    const inAuthGroup = ['welcome', 'login', 'signup', 'verification-pending'].includes(segments[0] as any);

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/welcome');
    } else if (isLoggedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, isLoading, segments, router]);

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <>
      <StatusBar style="dark" backgroundColor={riderTheme.colors.background} translucent={false} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: riderTheme.colors.surface },
          headerShadowVisible: false,
          headerTintColor: riderTheme.colors.textPrimary,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: riderTheme.colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="verification-pending" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="order-details" options={{ headerShown: true, title: 'Order Details' }} />
      </Stack>
      {showStartupSplash && <StartupSplash onDone={() => setShowStartupSplash(false)} />}
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

