import React from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import GalleryScreen from '../screens/GalleryScreen';
import CameraScreen from '../screens/CameraScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import { TabIcon } from '../components/TabIcons';
import { colors } from '../components/Design';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  return (
    <Tab.Navigator screenOptions={({route}) => ({
      headerShown: false,
      tabBarActiveTintColor: colors.pink,
      tabBarInactiveTintColor: colors.ink,
      tabBarStyle: [styles.tabBar, {height: 58 + bottomPadding, paddingBottom: bottomPadding}],
      tabBarLabelStyle: styles.tabBarLabel,
      tabBarIcon: ({color}) => <TabIcon name={route.name} color={color}/>,
    })}>
      <Tab.Screen name="Gallery" component={GalleryScreen}/>
      <Tab.Screen name="Catch" component={CameraScreen}/>
      <Tab.Screen name="User" component={UserProfileScreen}/>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {backgroundColor: colors.cream, borderTopWidth: 1, borderTopColor: '#EEDBC7', paddingTop: 6},
  tabBarLabel: {fontSize: 11, fontWeight: '600', marginTop: 3},
});
