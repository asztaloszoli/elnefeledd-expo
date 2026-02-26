import { playRingtone as nativePlay, stopRingtone as nativeStop } from '../../modules/expo-ringtone';

/**
 * Play the phone's default ringtone using native Android API.
 * Uses RingtoneManager to get the actual device ringtone URI,
 * and MediaPlayer to play it at ALARM volume level, looping.
 * Auto-stops after 15 minutes.
 */
export const playRingtone = async (): Promise<void> => {
  try {
    await nativePlay(900000);
    console.log('[ringtoneService] Native ringtone started (auto-stop: 15 min)');
  } catch (error) {
    console.log('[ringtoneService] Native ringtone failed:', error);
  }
};

/**
 * Stop the currently playing ringtone.
 */
export const stopRingtone = async (): Promise<void> => {
  try {
    await nativeStop();
  } catch (error) {
    // ignore — may already be stopped
  }
};
