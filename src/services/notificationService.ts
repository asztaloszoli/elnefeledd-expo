import notifee, {
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  TriggerType,
  TimestampTrigger,
  AuthorizationStatus,
  EventType,
  Event,
} from '@notifee/react-native';
import { Platform, PermissionsAndroid, Linking, Alert } from 'react-native';

let RingtonePlayer: { play(): Promise<void>; stop(): Promise<void>; isPlaying(): Promise<boolean> };
try {
  RingtonePlayer = require('../../modules/ringtone-player').default;
} catch (e) {
  console.warn('RingtonePlayer native module not available:', e);
  RingtonePlayer = {
    play: async () => { console.warn('RingtonePlayer.play: native module not loaded'); },
    stop: async () => { console.warn('RingtonePlayer.stop: native module not loaded'); },
    isPlaying: async () => false,
  };
}

const CHANNEL_ID = 'elnefeledd-alarms';
const SNOOZE_MINUTES = 5;

export const setupNotificationChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Emlékeztetők',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    bypassDnd: false,
  });
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    if (result !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
};

export const checkExactAlarmPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  const powerManagerInfo = await notifee.getPowerManagerInfo();
  const batteryOptimizationEnabled = await notifee.isBatteryOptimizationEnabled();

  return !batteryOptimizationEnabled;
};

export const openBatteryOptimizationSettings = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  await notifee.openBatteryOptimizationSettings();
};

export const openExactAlarmSettings = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  if (Platform.Version >= 31) {
    await Linking.openSettings();
  }
};

export const scheduleReminder = async (
  noteId: string,
  title: string,
  body: string,
  triggerDate: Date
): Promise<string> => {
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    alarmManager: {
      allowWhileIdle: true,
    },
  };

  const notificationId = await notifee.createTriggerNotification(
    {
      id: noteId,
      title: title,
      body: body || 'Emlékeztető!',
      android: {
        channelId: CHANNEL_ID,
        category: AndroidCategory.ALARM,
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        sound: undefined,
        vibrationPattern: [300, 500, 300, 500],
        fullScreenAction: {
          id: 'default',
        },
        pressAction: {
          id: 'default',
        },
        actions: [
          {
            title: 'Szundi (5 perc)',
            pressAction: {
              id: 'snooze',
            },
          },
          {
            title: 'Leállítás',
            pressAction: {
              id: 'dismiss',
            },
          },
        ],
        autoCancel: false,
        ongoing: true,
      },
      data: {
        noteId: noteId,
        originalTitle: title,
        originalBody: body || 'Emlékeztető!',
      },
    },
    trigger
  );

  return notificationId;
};

export const cancelReminder = async (notificationId: string): Promise<void> => {
  try {
    await notifee.cancelNotification(notificationId);
    await notifee.cancelTriggerNotification(notificationId);
  } catch (e) {
    console.warn('cancelReminder error:', e);
  }
};

export const cancelAllReminders = async (): Promise<void> => {
  await notifee.cancelAllNotifications();
  await notifee.cancelTriggerNotifications();
};

export const handleBackgroundEvent = async (event: Event): Promise<void> => {
  const { type, detail } = event;
  const { notification, pressAction } = detail;

  if (!notification) return;

  switch (type) {
    case EventType.DELIVERED:
      try {
        await RingtonePlayer.play();
      } catch (e) {
        console.warn('RingtonePlayer.play error:', e);
      }
      break;

    case EventType.ACTION_PRESS:
      try {
        await RingtonePlayer.stop();
      } catch (e) {
        console.warn('RingtonePlayer.stop error:', e);
      }

      if (pressAction?.id === 'snooze') {
        const snoozeTime = Date.now() + SNOOZE_MINUTES * 60 * 1000;
        const noteId = notification.data?.noteId as string;
        const title = notification.data?.originalTitle as string;
        const body = notification.data?.originalBody as string;

        await notifee.cancelNotification(notification.id!);

        await scheduleReminder(
          noteId,
          title || 'Emlékeztető',
          body || 'Emlékeztető!',
          new Date(snoozeTime)
        );
      } else if (pressAction?.id === 'dismiss') {
        await notifee.cancelNotification(notification.id!);
      }
      break;

    case EventType.DISMISSED:
      try {
        await RingtonePlayer.stop();
      } catch (e) {
        console.warn('RingtonePlayer.stop error:', e);
      }
      break;

    default:
      break;
  }
};

export const handleForegroundEvent = (event: Event): void => {
  const { type, detail } = event;
  const { notification, pressAction } = detail;

  if (!notification) return;

  if (type === EventType.DELIVERED) {
    RingtonePlayer.play().catch((e: any) =>
      console.warn('RingtonePlayer.play error:', e)
    );
    return;
  }

  if (type === EventType.ACTION_PRESS) {
    RingtonePlayer.stop().catch((e: any) =>
      console.warn('RingtonePlayer.stop error:', e)
    );

    if (pressAction?.id === 'snooze') {
      const snoozeTime = Date.now() + SNOOZE_MINUTES * 60 * 1000;
      const noteId = notification.data?.noteId as string;
      const title = notification.data?.originalTitle as string;
      const body = notification.data?.originalBody as string;

      notifee.cancelNotification(notification.id!).then(() => {
        scheduleReminder(
          noteId,
          title || 'Emlékeztető',
          body || 'Emlékeztető!',
          new Date(snoozeTime)
        );
      });
    } else if (pressAction?.id === 'dismiss') {
      notifee.cancelNotification(notification.id!);
    }
  }

  if (type === EventType.DISMISSED) {
    RingtonePlayer.stop().catch((e: any) =>
      console.warn('RingtonePlayer.stop error:', e)
    );
  }
};
