import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications } from './src/services/notificationService';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

function AppContent() {
  const { colors } = useTheme();

  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style={colors.statusBar} />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
