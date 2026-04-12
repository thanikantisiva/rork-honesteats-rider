/**
 * Background Location Task
 *
 * Registered with expo-task-manager + expo-location.
 * Runs as an Android Foreground Service (survives backgrounding / screen lock)
 * and as an iOS background-location task (blue bar in status bar).
 *
 * ⚠️  TaskManager.defineTask MUST be called at module top-level (not inside a
 *     component). This file MUST be imported before expo-router/entry (see index.js).
 */

import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_LOCATION_TASK = 'yumdude-rider-bg-location';

async function resolveApiBaseUrl(): Promise<string> {
  try {
    const phone = await AsyncStorage.getItem('@rider_phone');
    if (!phone) return 'https://api.yumdude.com';
    // Mirror isMockPhone() logic from lib/api.ts
    const mockPrefixes = ['+1555', '+15550', '9999', '1234567890'];
    const isMock = mockPrefixes.some((p) => phone.startsWith(p));
    return isMock ? 'https://api.dev.yumdude.com' : 'https://api.yumdude.com';
  } catch {
    return 'https://api.yumdude.com';
  }
}

async function sendLocationUpdate(
  baseUrl: string,
  riderId: string,
  token: string,
  lat: number,
  lng: number,
  speed: number,
  heading: number,
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/v1/riders/${riderId}/location`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lat, lng, speed, heading }),
  });

  if (res.ok) {
    console.log(`[BG Location] ✅ ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  } else {
    console.warn(`[BG Location] ⚠️ API returned ${res.status}`);
  }
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error(`[BG Location] Task error: ${error.message}`);
    return;
  }

  try {
    const [riderId, token, baseUrl] = await Promise.all([
      AsyncStorage.getItem('@rider_id'),
      AsyncStorage.getItem('@jwt_token'),
      resolveApiBaseUrl(),
    ]);

    if (!riderId || !token) {
      console.warn('[BG Location] No credentials — skipping update');
      return;
    }

    if (data?.locations?.length) {
      // Fresh GPS fix from the OS — use it and cache it
      const loc: Location.LocationObject = data.locations[data.locations.length - 1];
      const { latitude, longitude, speed, heading } = loc.coords;
      const speedKmh = speed != null ? speed * 3.6 : 0; // m/s → km/h

      await AsyncStorage.setItem(
        '@bg_last_location',
        JSON.stringify({ lat: latitude, lng: longitude, speed: speedKmh, heading: heading ?? 0 }),
      );

      await sendLocationUpdate(baseUrl, riderId, token, latitude, longitude, speedKmh, heading ?? 0);
    } else {
      // OS fired the task but provided no new location (stationary / GPS delay).
      // Still send a keepalive using the cached last-known location so lastSeen
      // stays fresh and the rider is not filtered out as stale by the assignment Lambda.
      const cached = await AsyncStorage.getItem('@bg_last_location');
      if (cached) {
        const { lat, lng, speed, heading } = JSON.parse(cached);
        console.log('[BG Location] No new GPS fix — keepalive with cached location');
        await sendLocationUpdate(baseUrl, riderId, token, lat, lng, speed, heading);
      } else {
        console.warn('[BG Location] No GPS fix and no cached location — skipping keepalive');
      }
    }
  } catch (err) {
    console.error('[BG Location] Failed to send update:', err);
  }
});
