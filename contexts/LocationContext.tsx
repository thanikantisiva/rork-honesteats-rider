/**
 * Location Context for Rider App
 *
 * OS-level background tracking via expo-task-manager + expo-location:
 *  • Android: Foreground Service — survives backgrounding and screen lock
 *  • iOS: Background location mode (shows blue bar in status bar)
 *
 * Three-layer approach:
 *  1. OS background task    — continues when JS thread is suspended
 *  2. Foreground subscription — keeps UI state fresh while app is visible
 *  3. Heartbeat (25 s)       — keeps lastSeen fresh even when stationary
 *     (uses refs, NOT state, to avoid the stale-closure bug)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { riderStatusAPI } from '@/lib/api';
import { useAuth } from './AuthContext';
import { BACKGROUND_LOCATION_TASK } from '@/tasks/background-location';

interface LocationContextType {
  currentLocation: { lat: number; lng: number } | null;
  isOnline: boolean;
  isTracking: boolean;
  toggleOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

/** Must be less than RIDER_LAST_SEEN_STALE_SECONDS on the backend (currently 90 s). */
const HEARTBEAT_INTERVAL_MS = 25_000;

export function LocationProvider({ children }: { children: ReactNode }) {
  const { rider, isLoggedIn } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  // Refs — always have the latest value inside setInterval (no stale-closure)
  const currentLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const riderRef = useRef(rider);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fgSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // Keep refs in sync with state / props
  useEffect(() => { riderRef.current = rider; }, [rider]);
  useEffect(() => { currentLocationRef.current = currentLocation; }, [currentLocation]);

  // Sync isOnline from backend on mount (so UI reflects actual status after app restart)
  useEffect(() => {
    if (!isLoggedIn || !rider) return;
    riderStatusAPI.getStatus(rider.riderId)
      .then((data) => {
        if (data.isActive) {
          setIsOnline(true);
          // Also resume tracking if rider was left online
          void startTracking();
        }
      })
      .catch((err) => {
        console.warn('⚠️ Could not fetch rider status on mount:', err);
      });
  }, [isLoggedIn, rider?.riderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup when logged out
  useEffect(() => {
    if (!isLoggedIn) {
      void stopTracking();
    }
    return () => { void stopTracking(); };
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopTracking = useCallback(async () => {
    // 1. Clear heartbeat
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    // 2. Stop foreground subscription
    if (fgSubscriptionRef.current) {
      fgSubscriptionRef.current.remove();
      fgSubscriptionRef.current = null;
    }

    // 3. Stop OS background task
    try {
      const registered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (registered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('✅ Background location task stopped');
      }
    } catch (err) {
      console.warn('⚠️ Failed to stop background location task:', err);
    }

    setIsTracking(false);
    console.log('✅ Location tracking stopped');
  }, []);

  const startTracking = useCallback(async () => {
    if (!rider) return;

    console.log('📍 Starting OS-level location tracking...');

    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.error('❌ Foreground location permission denied');
      return;
    }

    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      console.warn('⚠️ Background permission denied — tracking limited to foreground');
    }

    // ------------------------------------------------------------------
    // 1. OS background task (Android Foreground Service / iOS BG mode)
    // ------------------------------------------------------------------
    try {
      const alreadyRunning = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      if (alreadyRunning) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 15_000,   // OS fires callback at most every 15 s
        distanceInterval: 10,   // or whenever rider moves ≥ 10 m
        foregroundService: {
          notificationTitle: 'YumDude Rider',
          notificationBody: 'Tracking location for order assignment...',
          notificationColor: '#E8352A',
        },
        showsBackgroundLocationIndicator: true, // iOS blue bar
        pausesUpdatesAutomatically: false,
      });

      console.log('✅ Background location task started');
    } catch (err) {
      console.error('❌ Background location task failed (foreground-only fallback):', err);
    }

    // ------------------------------------------------------------------
    // 2. Foreground subscription — keeps UI location state updated
    // ------------------------------------------------------------------
    try {
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5_000, distanceInterval: 10 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
        }
      );
      fgSubscriptionRef.current = sub;
    } catch (err) {
      console.error('❌ Foreground subscription failed:', err);
    }

    // ------------------------------------------------------------------
    // 3. Heartbeat — runs every 25 s regardless of GPS state.
    //    • If location is available → send full location update (updates lastSeen + lat/lng)
    //    • If location is null      → send keepalive ping (updates lastSeen only)
    //    This prevents the rider being marked stale by the assignment Lambda
    //    when GPS fix has not arrived yet.
    //    Reads from refs (not state) — no stale closure possible.
    // ------------------------------------------------------------------
    heartbeatRef.current = setInterval(async () => {
      const loc = currentLocationRef.current;
      const r = riderRef.current;
      if (!r) return;

      try {
        if (loc) {
          await riderStatusAPI.updateLocation(r.riderId, loc.lat, loc.lng, 0, 0);
          console.log(`💓 Heartbeat: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`);
        } else {
          // No GPS fix yet — keepalive: just touch lastSeen so we stay assignable
          await riderStatusAPI.toggleStatus(r.riderId, true);
          console.log('💓 Heartbeat: keepalive (no GPS fix yet)');
        }
      } catch (err) {
        console.error('❌ Heartbeat failed:', err);
      }
    }, HEARTBEAT_INTERVAL_MS);

    setIsTracking(true);
    console.log('✅ Location tracking active (OS task + foreground + heartbeat)');
  }, [rider]);

  const toggleOnline = useCallback(async () => {
    if (!rider) return;

    try {
      if (!isOnline) {
        console.log('🟢 Going online...');

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') throw new Error('Location permission not granted');

        const snapshot = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = snapshot.coords;
        console.log(`📍 Current location: ${latitude}, ${longitude}`);

        await riderStatusAPI.toggleStatus(rider.riderId, true, latitude, longitude);
        setCurrentLocation({ lat: latitude, lng: longitude });
        setIsOnline(true);
        await startTracking();
        console.log('✅ Rider is now ONLINE');
      } else {
        console.log('🔴 Going offline...');

        let finalLat: number | undefined;
        let finalLng: number | undefined;

        try {
          const snapshot = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          finalLat = snapshot.coords.latitude;
          finalLng = snapshot.coords.longitude;
          console.log(`📍 Final location: ${finalLat}, ${finalLng}`);
        } catch {
          if (currentLocation) {
            finalLat = currentLocation.lat;
            finalLng = currentLocation.lng;
          }
        }

        await stopTracking();
        await riderStatusAPI.toggleStatus(rider.riderId, false, finalLat, finalLng);
        setIsOnline(false);
        console.log('✅ Rider is now OFFLINE');
      }
    } catch (error) {
      console.error('❌ Failed to toggle online status:', error);
      throw error;
    }
  }, [rider, isOnline, currentLocation, startTracking, stopTracking]);

  const goOffline = useCallback(async () => {
    if (!rider || !isOnline) return;

    try {
      console.log('🔴 Setting rider offline (logout/app close)...');
      const finalLat = currentLocation?.lat;
      const finalLng = currentLocation?.lng;
      await stopTracking();
      await riderStatusAPI.toggleStatus(rider.riderId, false, finalLat, finalLng);
      setIsOnline(false);
      console.log('✅ Rider offline (logout/app close)');
    } catch (error) {
      console.error('❌ Failed to set rider offline:', error);
      // Don't throw — called during cleanup
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
