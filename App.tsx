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

try {
  notifee.onBackgroundEvent(handleBackgroundEvent);
} catch (e) {
  console.warn('onBackgroundEvent registration failed:', e);
}

export default function App() {
  useEffect(() => {
    const init = async () => {
      try {
        await setupNotificationChannel();
        await requestNotificationPermission();
        await rescheduleAllReminders();
        console.log('App init completed successfully');
      } catch (e) {
        console.error('App init error:', e);
      }
    };
    init();

    try {
      return notifee.onForegroundEvent(handleForegroundEvent);
    } catch (e) {
      console.warn('onForegroundEvent registration failed:', e);
    }
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <AppNavigator />
    </NavigationContainer>
  );
}
