import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { requestNotificationPermission } from './firebase-messaging';
import { hasRiderOverlayPermission, requestRiderOverlayPermission } from './rider-floating-service';

export type MandatoryPermissionKey =
  | 'notifications'
  | 'location_foreground'
  | 'location_background'
  | 'camera'
  | 'photos'
  | 'overlay';

const LABELS: Record<MandatoryPermissionKey, string> = {
  notifications: 'Notifications',
  location_foreground: 'Location',
  location_background: 'Background location',
  camera: 'Camera',
  photos: 'Photos',
  overlay: 'Display over other apps',
};

export function formatMandatoryPermissionList(keys: MandatoryPermissionKey[]): string {
  return keys.map((key) => LABELS[key]).join(', ');
}

export async function getMissingMandatoryPermissions(): Promise<MandatoryPermissionKey[]> {
  const missing: MandatoryPermissionKey[] = [];

  const notificationGranted = await hasNotificationPermission();
  if (!notificationGranted) {
    missing.push('notifications');
  }

  const fg = await Location.getForegroundPermissionsAsync();
  if (!fg.granted) {
    missing.push('location_foreground');
  }

  const bg = await Location.getBackgroundPermissionsAsync();
  if (!bg.granted) {
    missing.push('location_background');
  }

  const camera = await ImagePicker.getCameraPermissionsAsync();
  if (!camera.granted) {
    missing.push('camera');
  }

  const media = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (!media.granted) {
    missing.push('photos');
  }

  if (Platform.OS === 'android') {
    const overlayGranted = await hasRiderOverlayPermission();
    if (!overlayGranted) {
      missing.push('overlay');
    }
  }

  return missing;
}

export async function requestMandatoryPermissions(): Promise<{
  granted: boolean;
  missing: MandatoryPermissionKey[];
}> {
  const notificationGranted = await requestNotificationPermission();

  let fgGranted = (await Location.getForegroundPermissionsAsync()).granted;
  if (!fgGranted) {
    fgGranted = (await Location.requestForegroundPermissionsAsync()).granted;
  }

  let bgGranted = (await Location.getBackgroundPermissionsAsync()).granted;
  if (!bgGranted) {
    bgGranted = (await Location.requestBackgroundPermissionsAsync()).granted;
  }

  let cameraGranted = (await ImagePicker.getCameraPermissionsAsync()).granted;
  if (!cameraGranted) {
    cameraGranted = (await ImagePicker.requestCameraPermissionsAsync()).granted;
  }

  let mediaGranted = (await ImagePicker.getMediaLibraryPermissionsAsync()).granted;
  if (!mediaGranted) {
    mediaGranted = (await ImagePicker.requestMediaLibraryPermissionsAsync()).granted;
  }

  let overlayGranted = true;
  if (Platform.OS === 'android') {
    overlayGranted = await hasRiderOverlayPermission();
    if (!overlayGranted) {
      await requestRiderOverlayPermission();
      overlayGranted = await hasRiderOverlayPermission();
    }
  }

  const missing: MandatoryPermissionKey[] = [];
  if (!notificationGranted) missing.push('notifications');
  if (!fgGranted) missing.push('location_foreground');
  if (!bgGranted) missing.push('location_background');
  if (!cameraGranted) missing.push('camera');
  if (!mediaGranted) missing.push('photos');
  if (!overlayGranted) missing.push('overlay');

  return {
    granted: missing.length === 0,
    missing,
  };
}

async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    if (Platform.Version < 33) {
      return true;
    }
    const settings = await requestPermissionStatusAndroid();
    return settings;
  }

  const settings = await requestPermissionStatusIOS();
  return settings;
}

async function requestPermissionStatusAndroid(): Promise<boolean> {
  try {
    const { authorizationStatus } = await import('@notifee/react-native').then((m) => m.default.getNotificationSettings());
    return authorizationStatus >= 1;
  } catch {
    return false;
  }
}

async function requestPermissionStatusIOS(): Promise<boolean> {
  try {
    const { authorizationStatus } = await import('@notifee/react-native').then((m) => m.default.getNotificationSettings());
    return authorizationStatus >= 1;
  } catch {
    return false;
  }
}
