import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Kanit_400Regular,
  Kanit_500Medium,
  Kanit_600SemiBold,
  Kanit_700Bold,
  Kanit_800ExtraBold,
} from '@expo-google-fonts/kanit';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  useFonts({
    Kanit: Kanit_400Regular,
    'Kanit-Regular': Kanit_400Regular,
    'Kanit-Medium': Kanit_500Medium,
    'Kanit-SemiBold': Kanit_600SemiBold,
    'Kanit-Bold': Kanit_700Bold,
    'Kanit-ExtraBold': Kanit_800ExtraBold,
    Kanit_400Regular,
    Kanit_500Medium,
    Kanit_600SemiBold,
    Kanit_700Bold,
    Kanit_800ExtraBold,
  });

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
