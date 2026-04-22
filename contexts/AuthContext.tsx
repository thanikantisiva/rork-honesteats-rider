/**
 * Auth Context for Rider App
 * Manages rider authentication state
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { AppState } from 'react-native';
import { riderStatusAPI, api, userAPI, setApiBaseUrlForPhone } from '@/lib/api';

interface Rider {
  riderId: string;
  phone: string;
  name: string;
}

interface AuthContextType {
  rider: Rider | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  /**
   * True when the rider has accepted the in-app Prominent Disclosure.
   * Persisted in AsyncStorage under `@rider_disclosure_accepted_v1`.
   * Required by Google Play policy before any background location permission
   * prompt is shown.
   */
  disclosureAccepted: boolean;
  login: (rider: Rider) => Promise<void>;
  logout: (goOfflineCallback?: () => Promise<void>) => Promise<void>;
  updateRider: (updates: Partial<Rider>) => Promise<void>;
  /**
   * Persist the rider's explicit tap-to-accept on the Disclosure screen.
   * Called from `app/disclosure.tsx` after the user taps "I Agree and Continue".
   */
  acceptDisclosure: () => Promise<void>;
}

/**
 * Key for the Prominent Disclosure consent flag. Bump the suffix (`_v2`, etc.)
 * if the disclosure copy changes materially and we need to re-prompt existing
 * riders for fresh consent.
 */
const DISCLOSURE_FLAG_KEY = '@rider_disclosure_accepted_v1';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [rider, setRider] = useState<Rider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [disclosureAccepted, setDisclosureAccepted] = useState(false);

  useEffect(() => {
    loadRiderSession();
  }, []);

  // NOTE: App state changes (background/foreground) are NO LONGER automatically setting rider offline
  // Rider stays online even when app is backgrounded - only explicit toggle or logout sets offline
  // This prevents the rapid online/offline toggling issue

  const loadRiderSession = async () => {
    try {
      const loggedIn = await AsyncStorage.getItem('@rider_logged_in');
      const riderId = await AsyncStorage.getItem('@rider_id');
      const phone = await AsyncStorage.getItem('@rider_phone');
      const name = await AsyncStorage.getItem('@rider_name');
      const jwtToken = await AsyncStorage.getItem('@jwt_token');
      const disclosure = await AsyncStorage.getItem(DISCLOSURE_FLAG_KEY);
      setDisclosureAccepted(disclosure === 'true');

      const clearSession = async (reason: string) => {
        console.warn(`⚠️ Clearing stale session: ${reason}`);
        api.setJWTToken(null);
        await AsyncStorage.multiRemove([
          '@rider_logged_in',
          '@rider_id',
          '@rider_phone',
          '@rider_name',
          '@jwt_token',
          DISCLOSURE_FLAG_KEY,
        ]);
        setDisclosureAccepted(false);
      };

      if (loggedIn === 'true' && riderId && phone && name) {
        if (!jwtToken) {
          await clearSession('logged-in flag set but no JWT token');
          return;
        }

        // Validate the JWT against the backend before trusting it.
        // This catches tokens that survived a reinstall via Android Auto Backup
        // or that have since expired / been revoked.
        setApiBaseUrlForPhone(phone);
        api.setJWTToken(jwtToken);
        try {
          await riderStatusAPI.getStatus(riderId);
          // Token is valid — restore session
          setRider({ riderId, phone, name });
          setIsLoggedIn(true);
          console.log('✅ Session restored and JWT validated');
        } catch (err: any) {
          const status = err?.status ?? err?.statusCode;
          if (status === 401 || status === 403) {
            await clearSession('JWT rejected by backend (401/403) — forcing re-login');
          } else {
            // Network error or server down — restore session optimistically
            // so the rider isn't logged out due to connectivity issues.
            setRider({ riderId, phone, name });
            setIsLoggedIn(true);
            console.warn('⚠️ Could not validate JWT (network error) — restoring session optimistically');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load rider session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (riderData: Rider) => {
    await AsyncStorage.setItem('@rider_logged_in', 'true');
    await AsyncStorage.setItem('@rider_id', riderData.riderId);
    await AsyncStorage.setItem('@rider_phone', riderData.phone);
    await AsyncStorage.setItem('@rider_name', riderData.name);
    // Re-check the disclosure flag so the router can gate correctly for this
    // rider (fresh installs / different rider on same device).
    const disclosure = await AsyncStorage.getItem(DISCLOSURE_FLAG_KEY);
    setDisclosureAccepted(disclosure === 'true');
    setRider(riderData);
    setIsLoggedIn(true);
  };

  const acceptDisclosure = async () => {
    await AsyncStorage.setItem(DISCLOSURE_FLAG_KEY, 'true');
    setDisclosureAccepted(true);
    console.log('✅ Prominent disclosure accepted and persisted');
  };

  const logout = async (goOfflineCallback?: () => Promise<void>) => {
    // Call goOffline from LocationContext if provided (sets rider offline with final location)
    if (goOfflineCallback) {
      try {
        console.log('🔄 Setting rider offline on logout');
        await goOfflineCallback();
      } catch (error) {
        console.error('Failed to set rider offline on logout:', error);
      }
    }

    // Clear FCM token on backend so rider stops receiving push notifications
    if (rider?.phone) {
      try {
        await userAPI.logout(rider.phone, 'RIDER');
        console.log('🔔 FCM token cleared on backend');
      } catch (error) {
        console.error('Failed to clear FCM token on logout (non-fatal):', error);
      }
    }

    await AsyncStorage.multiRemove([
      '@rider_logged_in',
      '@rider_id',
      '@rider_phone',
      '@rider_name',
      '@jwt_token',
      '@bg_last_location',
      DISCLOSURE_FLAG_KEY,
    ]);
    setDisclosureAccepted(false);
    
    // Clear JWT token from API client
    api.setJWTToken(null);
    
    // Sign out from Firebase (only if user is signed in)
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        await auth().signOut();
        console.log('🔓 Signed out from Firebase');
      }
    } catch (error) {
      console.error('Firebase sign out error (non-fatal):', error);
    }
    
    setRider(null);
    setIsLoggedIn(false);
    console.log('✅ Logout complete');
  };

  const updateRider = async (updates: Partial<Rider>) => {
    if (!rider) return;

    const updatedRider = {
      ...rider,
      ...updates,
    };

    await AsyncStorage.setItem('@rider_id', updatedRider.riderId);
    await AsyncStorage.setItem('@rider_phone', updatedRider.phone);
    await AsyncStorage.setItem('@rider_name', updatedRider.name);
    setRider(updatedRider);
  };

  return (
    <AuthContext.Provider
      value={{
        rider,
        isLoading,
        isLoggedIn,
        disclosureAccepted,
        login,
        logout,
        updateRider,
        acceptDisclosure,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
