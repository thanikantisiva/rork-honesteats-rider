import { NativeModules, Platform } from 'react-native';

type RiderFloatingServiceModule = {
  start: (riderId: string, token: string, baseUrl: string) => void;
  stop: () => void;
  startRideAlert: (orderId: string, restaurantName: string, deliveryFee: number) => void;
  stopRideAlert: (orderId: string) => void;
  muteRideAlert: (orderId: string) => void;
  muteAllAlerts: () => void;
  hasOverlayPermission: () => Promise<boolean>;
  requestOverlayPermission: () => Promise<boolean>;
};

const nativeModule = NativeModules.RiderFloatingService as RiderFloatingServiceModule | undefined;

export function startRiderFloatingService(riderId: string, token: string, baseUrl: string) {
  if (Platform.OS !== 'android' || !nativeModule) {
    return;
  }

  nativeModule.start(riderId, token, baseUrl);
}

export function stopRiderFloatingService() {
  if (Platform.OS !== 'android' || !nativeModule) {
    return;
  }

  nativeModule.stop();
}

/**
 * Triggers the looping "new ride!" ring + sticky notification inside the
 * native :location process. Works in foreground, background, AND when the
 * React Native main process is killed (the bubble service has its own
 * MediaPlayer + Vibrator that survive process death). No-op on iOS — iOS
 * relies on APNs critical alerts via Notifee, configured separately.
 *
 * Safe to call repeatedly for the same orderId; the native side dedupes
 * via a SharedPreferences set shared with the order-poll fallback.
 */
export function startRiderRideAlert(
  orderId: string,
  restaurantName: string,
  deliveryFee: number,
) {
  if (Platform.OS !== 'android' || !nativeModule || !orderId) {
    return;
  }

  try {
    nativeModule.startRideAlert(orderId, restaurantName, Number.isFinite(deliveryFee) ? deliveryFee : 0);
  } catch {
    // Service may not be running (rider went offline before push arrived) —
    // that's fine; the contract is "ring while bubble is live".
  }
}

/**
 * Stops the looping ride alert. Pass `null` to stop every active ride
 * alert (e.g. AppState became `active`); pass an orderId to stop just that
 * one (after Accept/Reject or when an order moves past OFFERED_TO_RIDER on
 * the server).
 */
export function stopRiderRideAlert(orderId: string | null = null) {
  if (Platform.OS !== 'android' || !nativeModule) {
    return;
  }

  try {
    nativeModule.stopRideAlert(orderId ?? '');
  } catch {
    // Same as startRideAlert — fail-safe no-op when the service isn't running.
  }
}

/**
 * Mutes a specific offered order in the native :location service so its poll
 * loop does not restart the ring on the next OFFERED_TO_RIDER refresh.
 * Future/new orders are unaffected.
 */
export function muteRiderRideAlert(orderId: string) {
  if (Platform.OS !== 'android' || !nativeModule || !orderId) {
    return;
  }

  try {
    nativeModule.muteRideAlert(orderId);
  } catch {
    // Fail-safe no-op if the service is not currently running.
  }
}

/**
 * Stops ALL currently looping ride alerts in the native :location service
 * (both OFFERED_TO_RIDER and force-assigned RIDER_ASSIGNED) and mutes each
 * so the poll loop does not restart them. Use for the global "mute" button.
 */
export function muteAllRiderAlerts() {
  if (Platform.OS !== 'android' || !nativeModule) {
    return;
  }

  try {
    nativeModule.muteAllAlerts();
  } catch {
    // Fail-safe no-op if the service is not currently running.
  }
}

/** Returns true if "Display over other apps" permission is already granted. */
export async function hasRiderOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !nativeModule) return true;
  try {
    return await nativeModule.hasOverlayPermission();
  } catch {
    return false;
  }
}

/**
 * Opens the Android "Display over other apps" Settings page.
 * Call this before starting the floating service if the permission isn't
 * granted. Returns immediately — the user grants permission in Settings and
 * your AppState 'active' listener should re-check and start the service.
 */
export async function requestRiderOverlayPermission(): Promise<void> {
  if (Platform.OS !== 'android' || !nativeModule) return;
  try {
    await nativeModule.requestOverlayPermission();
  } catch (e) {
    console.warn('⚠️ requestOverlayPermission failed:', e);
  }
}
