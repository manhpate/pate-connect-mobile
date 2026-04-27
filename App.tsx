import 'react-native-gesture-handler';

import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppSessionProvider } from './src/context/AppSessionContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { palette } from './src/theme/tokens';

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.canvas,
    card: palette.surface,
    text: palette.ink,
    border: 'transparent',
    primary: palette.brand,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AppSessionProvider>
        <NavigationContainer theme={navigationTheme}>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
      </AppSessionProvider>
    </SafeAreaProvider>
  );
}
