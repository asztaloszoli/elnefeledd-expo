import { requireNativeModule } from 'expo-modules-core';

const ExpoRingtone = requireNativeModule('ExpoRingtone');

/**
 * Check if the app has permission to schedule exact alarms (Android 12+).
 */
export async function canScheduleExactAlarms(): Promise<boolean> {
  return ExpoRingtone.canScheduleExactAlarms();
}

/**
 * Open system settings to grant exact alarm permission (Android 12+).
 */
export async function requestExactAlarmPermission(): Promise<void> {
  return ExpoRingtone.requestExactAlarmPermission();
}

/**
 * Schedule an alarm using Android AlarmManager.
 * Fires even when app is killed/background. Starts a ForegroundService to play sound.
 */
export async function scheduleAlarm(
  alarmId: string,
  triggerAtMillis: number,
  title: string,
  body: string
): Promise<void> {
  return ExpoRingtone.scheduleAlarm(alarmId, triggerAtMillis, title, body);
}

/**
 * Cancel a previously scheduled alarm.
 */
export async function cancelAlarm(alarmId: string): Promise<void> {
  return ExpoRingtone.cancelAlarm(alarmId);
}

/**
 * Cancel all scheduled alarms.
 */
export async function cancelAllAlarms(): Promise<void> {
  return ExpoRingtone.cancelAllAlarms();
}

/**
 * Stop the currently playing alarm (ForegroundService).
 */
export async function stopAlarm(): Promise<void> {
  return ExpoRingtone.stopAlarm();
}

/**
 * Schedule a test alarm 3 seconds from now.
 */
export async function triggerTestAlarm(): Promise<void> {
  return ExpoRingtone.triggerTestAlarm();
}
