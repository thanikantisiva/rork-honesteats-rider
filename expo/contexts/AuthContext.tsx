/**
 * Auth Context for Rider App
 * Manages rider authentication state
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { AppState } from 'react-native';
import { riderStatusAPI, api, userAPI } from '@/lib/api';

interface Rider {
  riderId: string;
  phone: string;
  name: string;
}

interface AuthContextType {
  rider: Rider | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (rider: Rider) => Promise<void>;
  logout: (goOfflineCallback?: () => Promise<void>) => Promise<void>;
  updateRider: (updates: Partial<Rider>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [rider, setRider] = useState<Rider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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

      if (loggedIn === 'true' && riderId && phone && name) {
        setRider({ riderId, phone, name });
        setIsLoggedIn(true);
      }
      
      if (jwtToken) {
        api.setJWTToken(jwtToken);
        console.log('✅ JWT token loaded and set in API client');
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
    setRider(riderData);
    setIsLoggedIn(true);
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
    ]);
    
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
    <AuthContext.Provider value={{ rider, isLoading, isLoggedIn, login, logout, updateRider }}>
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
