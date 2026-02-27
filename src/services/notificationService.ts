import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const REMINDER_CATEGORY_ID = 'reminder';
export const STOP_ACTION_ID = 'stop_ringtone';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
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

  await registerReminderCategory();

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders_v5', {
      name: 'Emlékeztetők',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'alarm_sound.wav',
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
  }

  return true;
};

const registerReminderCategory = async (): Promise<void> => {
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
    {
      identifier: STOP_ACTION_ID,
      buttonTitle: '⏹ Leállítás',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
};

export const scheduleReminder = async (
  title: string,
  body: string,
  triggerDate: Date
): Promise<string> => {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 ' + title,
      body: body || 'Emlékeztető!',
      sound: 'alarm_sound.wav',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: REMINDER_CATEGORY_ID,
      ...(Platform.OS === 'android' && { channelId: 'reminders_v5' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
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
