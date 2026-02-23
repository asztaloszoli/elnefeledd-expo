import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false, // We play the ringtone separately via ringtoneService
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotifications = async (): Promise<boolean> => {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders_v3', {
      name: 'Emlékeztetők',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default', // Fallback sound for background notifications
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  return true;
};

export const scheduleReminder = async (
  title: string,
  body: string,
  triggerDate: Date
): Promise<string> => {
  const secondsUntil = Math.max(
    Math.floor((triggerDate.getTime() - Date.now()) / 1000),
    1
  );

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 ' + title,
      body: body || 'Emlékeztető!',
      sound: 'default', // Fallback for background; foreground ringtone handled by ringtoneService
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === 'android' && { channelId: 'reminders_v3' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntil,
    },
  });

  return id;
};

export const cancelReminder = async (notificationId: string): Promise<void> => {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
};

export const cancelAllReminders = async (): Promise<void> => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
