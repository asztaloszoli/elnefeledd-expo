import { requireNativeModule } from 'expo-modules-core';

interface RingtonePlayerInterface {
  play(): Promise<void>;
  stop(): Promise<void>;
  isPlaying(): Promise<boolean>;
}

const RingtonePlayer =
  requireNativeModule<RingtonePlayerInterface>('RingtonePlayer');

export default RingtonePlayer;
