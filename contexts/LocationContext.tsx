/**
 * Location Context for Rider App
 * Manages background location tracking
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as Location from 'expo-location';
import { riderStatusAPI } from '@/lib/api';
import { useAuth } from './AuthContext';

interface LocationContextType {
  currentLocation: { lat: number; lng: number } | null;
  isOnline: boolean;
  isTracking: boolean;
  toggleOnline: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { rider, isLoggedIn } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (isLoggedIn && isOnline) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isLoggedIn, isOnline]);

  const startTracking = useCallback(async () => {
    if (!rider || isTracking) return;

    try {
      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.error('Foreground location permission not granted');
        return;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission not granted');
      }

      // Start watching location
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 50, // Or when moved 50 meters
        },
        async (location) => {
          const { latitude, longitude, speed, heading } = location.coords;
          
          setCurrentLocation({ lat: latitude, lng: longitude });

          // Send location to backend
          try {
            await riderStatusAPI.updateLocation(
              rider.riderId,
              latitude,
              longitude,
              speed ? speed * 3.6 : 0, // Convert m/s to km/h
              heading || 0
            );
            console.log(`📍 Location updated: ${latitude}, ${longitude}`);
          } catch (error) {
            console.error('Failed to update location:', error);
          }
        }
      );

      setLocationSubscription(subscription);
      setIsTracking(true);
      console.log('📍 Location tracking started');
    } catch (error) {
      console.error('Failed to start location tracking:', error);
    }
  }, [rider, isTracking]);

  const stopTracking = useCallback(() => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      setIsTracking(false);
      console.log('📍 Location tracking stopped');
    }
  }, [locationSubscription]);

  const toggleOnline = useCallback(async () => {
    if (!rider) return;

    try {
      const newStatus = !isOnline;
      
      // If going online, get current location first
      if (newStatus) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            
            const { latitude, longitude } = location.coords;
            console.log(`📍 Going online with location: ${latitude}, ${longitude}`);
            
            // Send location with status update
            await riderStatusAPI.toggleStatus(rider.riderId, newStatus, latitude, longitude);
            setCurrentLocation({ lat: latitude, lng: longitude });
          } else {
            // No location permission, just update status without location
            await riderStatusAPI.toggleStatus(rider.riderId, newStatus);
          }
        } catch (locationError) {
          console.error('Failed to get location, updating status without it:', locationError);
          await riderStatusAPI.toggleStatus(rider.riderId, newStatus);
        }
      } else {
        // Going offline, no location needed
        await riderStatusAPI.toggleStatus(rider.riderId, newStatus);
      }
      
      setIsOnline(newStatus);
      console.log(`🔄 Rider status: ${newStatus ? 'ONLINE' : 'OFFLINE'}`);
    } catch (error) {
      console.error('Failed to toggle online status:', error);
      throw error;
    }
  }, [rider, isOnline]);

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        isOnline,
        isTracking,
        toggleOnline,
        startTracking,
        stopTracking,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
