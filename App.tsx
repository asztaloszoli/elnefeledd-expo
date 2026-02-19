import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import notifee from '@notifee/react-native';
import AppNavigator from './src/navigation/AppNavigator';
import {
  setupNotificationChannel,
  requestNotificationPermission,
  handleBackgroundEvent,
  handleForegroundEvent,
} from './src/services/notificationService';
import { rescheduleAllReminders } from './src/services/rescheduleService';

notifee.onBackgroundEvent(handleBackgroundEvent);

export default function App() {
  useEffect(() => {
    const init = async () => {
      await setupNotificationChannel();
      await requestNotificationPermission();
      await rescheduleAllReminders();
    };
    init();

    return notifee.onForegroundEvent(handleForegroundEvent);
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <AppNavigator />
    </NavigationContainer>
  );
}
