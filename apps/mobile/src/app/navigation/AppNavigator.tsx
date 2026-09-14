import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import LoginScreen from '../screens/LoginScreen';
import MainTabNavigator from './MainTabNavigator';
import AnimalDetailScreen from '../screens/AnimalDetailScreen';
import ShareTemplateScreen from '../screens/ShareTemplateScreen';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isAuthenticated, isInitializing, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#BA796B" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F8F5EF' },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen
          name="AnimalDetail"
          component={AnimalDetailScreen}
          options={{ presentation: 'modal' }}
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
    backgroundColor: '#F8F5EF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
