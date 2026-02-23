import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let currentSound: Audio.Sound | null = null;

/**
 * Play the phone's default ringtone.
 * On Android, uses the system ringtone URI (content://settings/system/ringtone).
 * Falls back to default notification sound if ringtone URI fails.
 */
export const playRingtone = async (): Promise<void> => {
  try {
    // Stop any currently playing sound first
    await stopRingtone();

    // Configure audio to play even in silent mode and through the speaker
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    if (Platform.OS === 'android') {
      // Try to play the system ringtone
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'content://settings/system/ringtone' },
          {
            shouldPlay: true,
            isLooping: true,
            volume: 1.0,
          }
        );
        currentSound = sound;

        // Auto-stop after 30 seconds
        setTimeout(() => {
          stopRingtone();
        }, 30000);

        return;
      } catch (ringtoneError) {
        console.log('Could not play system ringtone, trying alarm:', ringtoneError);
      }

      // Fallback: try alarm sound
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'content://settings/system/alarm_alert' },
          {
            shouldPlay: true,
            isLooping: true,
            volume: 1.0,
          }
        );
        currentSound = sound;

        setTimeout(() => {
          stopRingtone();
        }, 30000);

        return;
      } catch (alarmError) {
        console.log('Could not play alarm sound either:', alarmError);
      }
    }
  } catch (error) {
    console.log('Error playing ringtone:', error);
  }
};

/**
 * Stop the currently playing ringtone.
 */
export const stopRingtone = async (): Promise<void> => {
  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    }
  } catch (error) {
    // Sound might already be unloaded
    currentSound = null;
  }
};
