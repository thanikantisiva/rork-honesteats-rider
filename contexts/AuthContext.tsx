/**
 * Auth Context for Rider App
 * Manages rider authentication state
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';

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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [rider, setRider] = useState<Rider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    loadRiderSession();
  }, []);

  const loadRiderSession = async () => {
    try {
      const loggedIn = await AsyncStorage.getItem('@rider_logged_in');
      const riderId = await AsyncStorage.getItem('@rider_id');
      const phone = await AsyncStorage.getItem('@rider_phone');
      const name = await AsyncStorage.getItem('@rider_name');

      if (loggedIn === 'true' && riderId && phone && name) {
        setRider({ riderId, phone, name });
        setIsLoggedIn(true);
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

  const logout = async () => {
    await AsyncStorage.multiRemove([
      '@rider_logged_in',
      '@rider_id',
      '@rider_phone',
      '@rider_name',
    ]);
    await auth().signOut();
    setRider(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ rider, isLoading, isLoggedIn, login, logout }}>
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
