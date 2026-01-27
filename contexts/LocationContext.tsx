/**
 * Location Context for Rider App
 * Redesigned for efficient location tracking:
 * 1. Single API call when going online (isActive=true, lat, lng)
 * 2. Location updates every 15s ONLY if location changed
 * 3. Single API call when going offline (isActive=false, lat, lng)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import * as Location from 'expo-location';
import { riderStatusAPI } from '@/lib/api';
import { useAuth } from './AuthContext';

interface LocationContextType {
  currentLocation: { lat: number; lng: number } | null;
  isOnline: boolean;
  isTracking: boolean;
  toggleOnline: () => Promise<void>;
  goOffline: () => Promise<void>; // For logout/app close
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

// Helper to calculate distance between two coordinates (in meters)
function getDistanceInMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const { rider, isLoggedIn } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  
  // Store previous location in ref to compare
  const previousLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const locationUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount or when logged out
  useEffect(() => {
    if (!isLoggedIn) {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isLoggedIn]);

  const startTracking = useCallback(async () => {
    if (!rider || isTracking) return;

    try {
      console.log('📍 Starting location tracking...');

      // Request permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.error('❌ Foreground location permission not granted');
        return;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('⚠️ Background location permission not granted');
      }

      // Start watching location with high accuracy
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Check every 5 seconds
          distanceInterval: 10, // Or when moved 10 meters
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          console.log(`📍 Location update: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      );

      locationSubscriptionRef.current = subscription;
      setIsTracking(true);

      // Set up interval to send location updates every 15 seconds (only if changed)
      const interval = setInterval(async () => {
        if (!currentLocation) return;

        const { lat, lng } = currentLocation;

        // Check if location changed significantly (more than 5 meters)
        if (previousLocationRef.current) {
          const distance = getDistanceInMeters(
            previousLocationRef.current.lat,
            previousLocationRef.current.lng,
            lat,
            lng
          );

          if (distance < 5) {
            console.log(`📍 Location unchanged (${distance.toFixed(1)}m), skipping update`);
            return;
          }

          console.log(`📍 Location changed by ${distance.toFixed(1)}m, sending update`);
        }

        // Send location update to backend
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          
          const { latitude, longitude, speed, heading } = location.coords;
          
          await riderStatusAPI.updateLocation(
            rider.riderId,
            latitude,
            longitude,
            speed ? speed * 3.6 : 0, // Convert m/s to km/h
            heading || 0
          );

          // Update previous location
          previousLocationRef.current = { lat: latitude, lng: longitude };
          console.log(`✅ Location sent to server: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } catch (error) {
          console.error('❌ Failed to send location update:', error);
        }
      }, 15000); // Every 15 seconds

      locationUpdateIntervalRef.current = interval;
      console.log('✅ Location tracking started');
    } catch (error) {
      console.error('❌ Failed to start location tracking:', error);
    }
  }, [rider, isTracking, currentLocation]);

  const stopTracking = useCallback(() => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }

    if (locationUpdateIntervalRef.current) {
      clearInterval(locationUpdateIntervalRef.current);
      locationUpdateIntervalRef.current = null;
    }

    setIsTracking(false);
    previousLocationRef.current = null;
    console.log('✅ Location tracking stopped');
  }, []);

  const toggleOnline = useCallback(async () => {
    if (!rider) return;

    try {
      const newStatus = !isOnline;

      if (newStatus) {
        // GOING ONLINE: Get current location and send with status
        console.log('🟢 Going online...');
        
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission not granted');
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = location.coords;
        console.log(`📍 Current location: ${latitude}, ${longitude}`);

        // Single API call with isActive=true, lat, lng
        await riderStatusAPI.toggleStatus(rider.riderId, true, latitude, longitude);
        
        setCurrentLocation({ lat: latitude, lng: longitude });
        previousLocationRef.current = { lat: latitude, lng: longitude };
        setIsOnline(true);

        // Start tracking
        await startTracking();
        
        console.log('✅ Rider is now ONLINE');
      } else {
        // GOING OFFLINE: Send final location with status
        console.log('🔴 Going offline...');
        
        let finalLat: number | undefined;
        let finalLng: number | undefined;

        // Try to get current location for final update
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            maximumAge: 30000, // Accept cached location up to 30 seconds old
          });
          finalLat = location.coords.latitude;
          finalLng = location.coords.longitude;
          console.log(`📍 Final location: ${finalLat}, ${finalLng}`);
        } catch (error) {
          console.warn('⚠️ Could not get final location, using last known');
          if (currentLocation) {
            finalLat = currentLocation.lat;
            finalLng = currentLocation.lng;
          }
        }

        // Stop tracking first
        stopTracking();

        // Single API call with isActive=false and final location
        await riderStatusAPI.toggleStatus(rider.riderId, false, finalLat, finalLng);
        
        setIsOnline(false);
        console.log('✅ Rider is now OFFLINE');
      }
    } catch (error) {
      console.error('❌ Failed to toggle online status:', error);
      throw error;
    }
  }, [rider, isOnline, currentLocation, startTracking, stopTracking]);

  // Public method for logout/app close (goes offline without throwing errors)
  const goOffline = useCallback(async () => {
    if (!rider || !isOnline) return;

    try {
      console.log('🔴 Setting rider offline (logout/app close)...');
      
      let finalLat: number | undefined;
      let finalLng: number | undefined;

      // Use last known location
      if (currentLocation) {
        finalLat = currentLocation.lat;
        finalLng = currentLocation.lng;
      }

      // Stop tracking
      stopTracking();

      // Send offline status with final location
      await riderStatusAPI.toggleStatus(rider.riderId, false, finalLat, finalLng);
      
      setIsOnline(false);
      console.log('✅ Rider offline (logout/app close)');
    } catch (error) {
      console.error('❌ Failed to set rider offline:', error);
      // Don't throw - this is called during cleanup
    }
  }, [rider, isOnline, currentLocation, stopTracking]);

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        isOnline,
        isTracking,
        toggleOnline,
        goOffline,
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
