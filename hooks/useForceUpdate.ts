import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/lib/api';
import { isVersionLower } from '@/utils/version';

const LAST_VERSION_CHECK_KEY = 'LAST_VERSION_CHECK_TIMESTAMP';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const APP_TYPE = 'rider';

interface ForceUpdateState {
  needsUpdate: boolean;
  storeUrl: string | null;
}

export function useForceUpdate() {
  const [state, setState] = useState<ForceUpdateState>({
    needsUpdate: false,
    storeUrl: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const lastCheck = await AsyncStorage.getItem(LAST_VERSION_CHECK_KEY);
        const now = Date.now();

        if (lastCheck && now - parseInt(lastCheck, 10) < ONE_DAY_MS) {
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/v1/config/app-version`
        );
        if (!response.ok) return;

        const data = await response.json();
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        const minVersion = data.minAppVersions?.[APP_TYPE]?.[platform];
        const storeUrl = data.storeUrls?.[APP_TYPE]?.[platform] || null;
        const currentVersion = Constants.expoConfig?.version || '0.0.0';

        await AsyncStorage.setItem(LAST_VERSION_CHECK_KEY, now.toString());

        if (!cancelled && minVersion && isVersionLower(currentVersion, minVersion)) {
          setState({ needsUpdate: true, storeUrl });
        }
      } catch {
        // Fail open — do not block the user on network errors
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const openStore = useCallback(() => {
    const url =
      state.storeUrl ||
      (Platform.OS === 'ios'
        ? 'https://apps.apple.com'
        : 'https://play.google.com/store');
    Linking.openURL(url);
  }, [state.storeUrl]);

  return { needsUpdate: state.needsUpdate, openStore };
}
