import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { TabIcon } from './TabIcons';
import { colors } from './Design';
export default function DetailTabs() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return <View style={{
    flexDirection: 'row',
    backgroundColor: colors.cream,
    borderTopWidth: 1,
    borderColor: colors.sand,
    paddingVertical: 12
  }}>{(['Gallery', 'Catch', 'User'] as (keyof MainTabParamList)[]).map(name => <Pressable key={name} accessibilityRole="button" onPress={() => nav.navigate('MainTabs', {
      screen: name
    })} style={{
      flex: 1,
      alignItems: 'center',
      gap: 5
    }}><TabIcon name={name} color={name === 'Catch' ? colors.pink : colors.ink}/><Text style={{
        fontSize: 11,
        color: name === 'Catch' ? colors.pink : colors.ink
      }}>{name}</Text></Pressable>)}</View>;
}
