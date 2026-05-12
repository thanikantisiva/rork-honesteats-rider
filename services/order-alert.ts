import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { AppState, Vibration } from 'react-native';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error)
    return String((error as { message: unknown }).message);
  return String(error);
}

function isAudioFocusBackgroundError(error: unknown): boolean {
  const msg = getErrorMessage(error);
  return (
    msg.includes('AudioFocusNotAcquired') ||
    msg.includes('in the background') ||
    msg.includes('audio focus could not be acquired')
  );
}

/** Android destroys the native player when the app backgrounds — treat as already-gone. */
function isPlayerGoneError(error: unknown): boolean {
  const msg = getErrorMessage(error);
  return msg.includes('Player does not exist') || msg.includes('player does not exist');
}

let ringSound: Audio.Sound | null = null;
let soundPromise: Promise<Audio.Sound | null> | null = null;
let isAlertPlaying = false;
/** Consumed once: skips the next startNewOrderAlert (used when app returns to foreground after push). */
let shouldSkipNextInAppOrderAlertStart = false;

/** Call when the user brings the app to the foreground so push-driven looping can stop without immediately re-starting expo-av on the same refresh. */
export function requestSkipNextInAppOrderAlertStart(): void {
  shouldSkipNextInAppOrderAlertStart = true;
}

async function getRingSound(): Promise<Audio.Sound | null> {
  if (ringSound) {
    return ringSound;
  }

  if (!soundPromise) {
    soundPromise = (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          shouldDuckAndroid: true,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
          playThroughEarpieceAndroid: false,
          // Allows the in-app ring to continue if the app is backgrounded before the rider opens it fully.
          staysActiveInBackground: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sounds/new-order-ring.wav'),
          { shouldPlay: false, volume: 1 }
        );

        ringSound = sound;
        return sound;
      } catch (error) {
        console.error('Failed to initialize order alert sound:', error);
        return null;
      } finally {
        soundPromise = null;
      }
    })();
  }

  return soundPromise;
}

export async function startNewOrderAlert(): Promise<void> {
  // expo-av cannot acquire audio focus while the app is backgrounded
  if (AppState.currentState !== 'active') {
    return;
  }

  if (shouldSkipNextInAppOrderAlertStart) {
    shouldSkipNextInAppOrderAlertStart = false;
    return;
  }

  try {
    const sound = await getRingSound();
    if (!sound) {
      return;
    }

    if (isAlertPlaying) {
      return;
    }

    Vibration.vibrate([0, 220, 120, 220]);
    await sound.stopAsync().catch(() => undefined);
    await sound.setPositionAsync(0).catch(() => undefined);
    await sound.setIsLoopingAsync(true);
    await sound.playAsync();
    isAlertPlaying = true;
  } catch (error) {
    if (isAudioFocusBackgroundError(error)) {
      return;
    }
    console.error('Failed to start new order alert:', error);
  }
}

export async function stopNewOrderAlert(): Promise<void> {
  try {
    if (!ringSound || !isAlertPlaying) {
      return;
    }

    await ringSound.stopAsync().catch(() => undefined);
    await ringSound.setPositionAsync(0).catch(() => undefined);
    await ringSound.setIsLoopingAsync(false).catch(() => undefined);
  } catch (error) {
    if (isPlayerGoneError(error) || isAudioFocusBackgroundError(error)) return;
    console.error('Failed to stop new order alert:', error);
  } finally {
    isAlertPlaying = false;
  }
}

export async function unloadNewOrderAlert(): Promise<void> {
  await stopNewOrderAlert().catch(() => undefined);

  if (!ringSound) {
    return;
  }

  // Null the global first — prevents any concurrent call from double-unloading
  const soundToUnload = ringSound;
  ringSound = null;
  isAlertPlaying = false;

  try {
    await soundToUnload.unloadAsync();
  } catch (error) {
    // "Player does not exist" means Android already released the native player
    // (common after backgrounding). Treat as success — the player is gone.
    if (isPlayerGoneError(error)) return;
    console.error('Failed to unload order alert sound:', error);
  }
}
