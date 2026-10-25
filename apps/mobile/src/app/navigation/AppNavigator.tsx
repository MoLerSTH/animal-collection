import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import OnboardingScreen from '../screens/OnboardingScreen';
import { appStorage } from '../../core/storage/mmkv';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import AnimalDetailScreen from '../screens/AnimalDetailScreen';
import ShareTemplateScreen from '../screens/ShareTemplateScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isInitializing, initializeAuth } = useAuthStore();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated && appStorage.getString('hasSeenOnboarding') && navigationRef.isReady()) {
      navigationRef.resetRoot({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [isAuthenticated, isInitializing, navigationRef]);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E06D79" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={!appStorage.getString('hasSeenOnboarding') ? 'Onboarding' : isAuthenticated ? 'MainTabs' : 'Login'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FDF8F2' },
          animation: 'none',
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{ animation: 'none' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Privacy" component={PrivacyScreen} />
        <Stack.Screen
          name="AnimalDetail"
          component={AnimalDetailScreen}
          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="ShareTemplate"
          component={ShareTemplateScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FDF8F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
