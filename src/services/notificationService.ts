import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  scheduleAlarm,
  cancelAlarm,
  cancelAllAlarms,
  canScheduleExactAlarms,
  requestExactAlarmPermission,
} from '../../modules/expo-ringtone';

/**
 * Request notification + exact alarm permissions.
 */
export const registerForPushNotifications = async (): Promise<boolean> => {
  // Notification permission (needed for foreground service notification)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    // Clean up all old expo-notifications channels
    for (const oldId of ['reminders', 'reminders_v2', 'reminders_v3', 'reminders_v4', 'reminders_v5', 'reminders_v6']) {
      try { await Notifications.deleteNotificationChannelAsync(oldId); } catch (_) {}
    }

    // Exact alarm permission (Android 12+)
    try {
      const canExact = await canScheduleExactAlarms();
      if (!canExact) {
        await requestExactAlarmPermission();
      }
    } catch (_) {}
  }

  return finalStatus === 'granted';
};

/**
 * Schedule a reminder using native AlarmManager.
 * Works in all app states: foreground, background, killed, after reboot.
 */
export const scheduleReminder = async (
  title: string,
  body: string,
  triggerDate: Date
): Promise<string> => {
  const id = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await scheduleAlarm(id, triggerDate.getTime(), title, body || 'Emlékeztető!');
  return id;
};

/**
 * Cancel a previously scheduled reminder.
 */
export const cancelReminder = async (notificationId: string): Promise<void> => {
  await cancelAlarm(notificationId);
};

/**
 * Cancel all scheduled reminders.
 */
export const cancelAllReminders = async (): Promise<void> => {
  await cancelAllAlarms();
};
