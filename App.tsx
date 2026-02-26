import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications, STOP_ACTION_ID } from './src/services/notificationService';
import { playRingtone, stopRingtone } from './src/services/ringtoneService';

export default function App() {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications();

    // When a notification is received (foreground), play the ringtone
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      playRingtone();
    });

    // When the user taps the notification or presses the 'Leállítás' button, stop the ringtone
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionId = response.actionIdentifier;
      if (actionId === STOP_ACTION_ID || actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        stopRingtone();
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
