import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import GalleryScreen from '../screens/GalleryScreen';
import CameraScreen from '../screens/CameraScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import {
  BookIcon,
  CompassIcon,
  UserCircleIcon,
  TabBarIconWrapper,
} from '../components/TabIcons';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3A2E2B',
        tabBarInactiveTintColor: '#756A63',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ focused }) => {
          // ถ้า active ให้ใช้สีชมพูอมน้ำตาลตามดีไซน์ ถ้าไม่ให้ใช้สีน้ำตาลเทา
          const iconColor = focused ? '#BA796B' : '#756A63';

          let iconComponent = null;
          if (route.name === 'Gallery') {
            iconComponent = <BookIcon color={iconColor} size={22} />;
          } else if (route.name === 'Catch') {
            iconComponent = <CompassIcon color={iconColor} size={22} />;
          } else if (route.name === 'User') {
            iconComponent = <UserCircleIcon color={iconColor} size={22} />;
          }

          return (
            <TabBarIconWrapper focused={focused}>
              {iconComponent}
            </TabBarIconWrapper>
          );
        },
      })}
    >
      <Tab.Screen name="Gallery" component={GalleryScreen} />
      <Tab.Screen name="Catch" component={CameraScreen} />
      <Tab.Screen name="User" component={UserProfileScreen} options={{ title: 'User' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#F8F5EF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 72,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
