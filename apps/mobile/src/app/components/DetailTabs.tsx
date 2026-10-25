import React from 'react';
import AppBottomTabBar from './AppBottomTabBar';
import { MainTabParamList } from '../navigation/types';

export interface DetailTabsProps {
  activeTab?: keyof MainTabParamList;
  onTabPress?: (tabName: keyof MainTabParamList) => void;
}

/**
 * Backward-compatible wrapper that renders the Design System's unified AppBottomTabBar.
 * Ensures complete visual and interaction consistency across all screens without duplication.
 */
export default function DetailTabs({
  activeTab = 'Gallery',
  onTabPress,
}: DetailTabsProps = {}) {
  return <AppBottomTabBar activeTab={activeTab} onTabPress={onTabPress} />;
}
