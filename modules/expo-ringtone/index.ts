import { requireNativeModule } from 'expo-modules-core';

const ExpoRingtone = requireNativeModule('ExpoRingtone');

/**
 * Play the device's default ringtone at alarm volume.
 * Uses Android's RingtoneManager + MediaPlayer natively.
 * Falls back to alarm sound, then notification sound if ringtone is unavailable.
 * @param durationMs - Auto-stop after this many milliseconds (default: 900000 = 15 min)
 */
export async function playRingtone(durationMs: number = 900000): Promise<void> {
  return ExpoRingtone.playRingtone(durationMs);
}

/**
 * Play the app's bundled alarm sound (res/raw/alarm_sound.wav) at alarm volume.
 * Used for testing and as notification channel sound.
 * @param durationMs - Auto-stop after this many milliseconds (default: 30000 = 30s for testing)
 */
export async function playAlarmSound(durationMs: number = 30000): Promise<void> {
  return ExpoRingtone.playAlarmSound(durationMs);
}

/**
 * Stop the currently playing ringtone immediately.
 */
export async function stopRingtone(): Promise<void> {
  return ExpoRingtone.stopRingtone();
}

/**
 * Check if the ringtone is currently playing.
 */
export async function isPlaying(): Promise<boolean> {
  return ExpoRingtone.isPlaying();
}
