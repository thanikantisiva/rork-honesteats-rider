import { NativeModules, Platform } from 'react-native';

type RiderFloatingServiceModule = {
  start: (riderId: string, token: string, baseUrl: string) => void;
  stop: () => void;
  startRideAlert: (orderId: string, restaurantName: string, deliveryFee: number) => void;
  stopRideAlert: (orderId: string) => void;
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
