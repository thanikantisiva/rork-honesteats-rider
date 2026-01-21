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
import firebaseApp from '@react-native-firebase/app';
import appCheck from '@react-native-firebase/app-check';

SplashScreen.preventAutoHideAsync();

// Initialize Firebase App and App Check
const initializeFirebase = async () => {
  try {
    // Check if Firebase is already initialized
    if (firebaseApp.apps.length === 0) {
      console.log('⚠️ Firebase app not initialized. This should not happen with proper config files.');
      return;
    }
    
    console.log('✅ Firebase App initialized (Rider App)');
    console.log('📱 Firebase App Name:', firebaseApp.app().name);
    
    // Now initialize App Check
    console.log('🔧 Initializing Firebase App Check with Play Integrity (Rider App)...');
    
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
      isTokenAutoRefreshEnabled: true 
    });
    
    console.log('✅ Firebase App Check initialized (Rider App)');
  } catch (error: any) {
    console.error('❌ Firebase initialization error:', error.message);
    console.warn('⚠️ Will continue without App Check');
  }
};

// Initialize on app start
initializeFirebase();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isLoggedIn, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
    <Stack>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="verification-pending" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="order-details" options={{ headerShown: true, title: 'Order Details' }} />
    </Stack>
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
