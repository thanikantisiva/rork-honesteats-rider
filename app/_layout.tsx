/**
 * Root Layout for Rider App
 */

import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { OrdersProvider, useOrders } from '@/contexts/OrdersContext';
import { LocationProvider } from '@/contexts/LocationContext';
import {
  setupNotificationListeners,
  setupFCMTokenRefreshListener,
  parseNotificationData,
  getLastNotificationResponse,
  cancelRiderLoopingPushNotifications,
} from '@/services/firebase-messaging';
import { stopNewOrderAlert, requestSkipNextInAppOrderAlertStart } from '@/services/order-alert';
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
  const { isLoggedIn, isLoading, disclosureAccepted } = useAuth();
  const { refreshOrders, acceptOrder, rejectOrder } = useOrders();
  const segments = useSegments();
  const router = useRouter();
  const [showStartupSplash, setShowStartupSplash] = useState(true);

  // Refs — prevent stale closures inside the one-time notification listener setup
  const refreshOrdersRef = useRef(refreshOrders);
  const acceptOrderRef = useRef(acceptOrder);
  const rejectOrderRef = useRef(rejectOrder);
  const routerRef = useRef(router);

  useEffect(() => { refreshOrdersRef.current = refreshOrders; }, [refreshOrders]);
  useEffect(() => { acceptOrderRef.current = acceptOrder; }, [acceptOrder]);
  useEffect(() => { rejectOrderRef.current = rejectOrder; }, [rejectOrder]);
  useEffect(() => { routerRef.current = router; }, [router]);

  useEffect(() => {
    // FCM arrived while app is in foreground
    const handleNotificationReceived = (remoteMessage: any) => {
      console.log('FCM notification received (foreground - rider):', remoteMessage);
      // Immediately refresh orders so the new offer appears without waiting for the 30s poll
      const type = remoteMessage?.data?.type;
      if (type === 'order_assigned' || type === 'order_accepted') {
        void refreshOrdersRef.current(true);
      }
    };

    // Notification tapped (regular press — navigate to order details)
    const handleNotificationOpened = (remoteMessage: any) => {
      console.log('FCM notification opened (rider):', remoteMessage);
      const data = parseNotificationData(remoteMessage.data);
      if (data?.orderId) {
        console.log('Navigating to order:', data.orderId);
        routerRef.current.push(`/order-details?orderId=${data.orderId}` as any);
      }
    };

    // Action button tapped (Accept / Reject) while app is in foreground
    const handleActionPress = async (actionId: string, data: Record<string, string>) => {
      const orderId = data.orderId;
      if (!orderId) return;

      if (actionId === 'ACCEPT_ORDER') {
        try {
          await acceptOrderRef.current(orderId, 'OFFERED_TO_RIDER');
          routerRef.current.push(`/order-details?orderId=${orderId}` as any);
        } catch (err) {
          console.error('Failed to accept order from notification:', err);
        }
      } else if (actionId === 'REJECT_ORDER') {
        try {
          await rejectOrderRef.current(orderId, 'declined_via_notification');
        } catch (err) {
          console.error('Failed to reject order from notification:', err);
        }
      }
    };

    // Handle taps that launched the app from a killed/background state
    getLastNotificationResponse().then((remoteMessage) => {
      if (remoteMessage) {
        console.log('App opened from FCM notification (rider):', remoteMessage);
        handleNotificationOpened(remoteMessage);
      }
    });

    const unsubscribeListeners = setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationOpened,
      handleActionPress,
    );
    const unsubscribeTokenRefresh = setupFCMTokenRefreshListener();

    return () => {
      unsubscribeListeners();
      unsubscribeTokenRefresh();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally one-time; refs stay fresh

  // When the rider opens the app: stop looping push sounds (Android) and in-app ring; then refresh orders.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      requestSkipNextInAppOrderAlertStart();
      void cancelRiderLoopingPushNotifications();
      void stopNewOrderAlert();
      void refreshOrdersRef.current(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const currentSegment = segments[0] as string | undefined;
    const inAuthGroup = ['welcome', 'login', 'signup', 'verification-pending'].includes(
      currentSegment as any,
    );
    const onDisclosure = currentSegment === 'disclosure';

    if (!isLoggedIn && !inAuthGroup) {
      router.replace('/welcome');
      return;
    }

    if (isLoggedIn && !disclosureAccepted) {
      // Logged in but hasn't accepted the Prominent Disclosure yet.
      // Block access to the tabs (where "Go Online" triggers background location
      // permission) and anywhere except the disclosure screen itself.
      if (!onDisclosure) {
        router.replace('/disclosure');
      }
      return;
    }

    if (isLoggedIn && disclosureAccepted && (inAuthGroup || onDisclosure)) {
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, isLoading, disclosureAccepted, segments, router]);

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
        <Stack.Screen
          name="disclosure"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        <Stack.Screen name="order-details" options={{ headerShown: true, title: 'Order Details' }} />
      </Stack>
      {showStartupSplash && <StartupSplash onDone={() => setShowStartupSplash(false)} />}
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

