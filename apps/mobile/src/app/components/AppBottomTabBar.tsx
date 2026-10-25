import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { TabIcon } from './TabIcons';
import { colors, typography } from './Design';
import { CameraIcon } from './CatalogIcons';
import { useTranslation } from '../../core/i18n/useLanguageStore';

export interface AppBottomTabBarProps {
  // Provided when used as tabBar in @react-navigation/bottom-tabs
  state?: BottomTabBarProps['state'];
  descriptors?: BottomTabBarProps['descriptors'];
  navigation?: BottomTabBarProps['navigation'];
  insets?: BottomTabBarProps['insets'];
  // Provided when used as a standalone component (e.g. in AnimalDetailScreen)
  activeTab?: keyof MainTabParamList;
  onTabPress?: (tabName: keyof MainTabParamList) => void;
}

interface TabConfig {
  name: keyof MainTabParamList;
  label: string;
  accessibilityLabel: string;
}

/**
 * Unified Design System Bottom Navigation Bar.
 * Used identically across all screens (Gallery, Catch, Profile, AnimalDetail)
 * with consistent hover states, zero layout jumping, and a single source of truth.
 */
export default function AppBottomTabBar({
  state,
  navigation,
  insets: customInsets,
  activeTab,
  onTabPress,
}: AppBottomTabBarProps) {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const safeAreaInsets = useSafeAreaInsets();
  const { t } = useTranslation();
  const bottomInset = customInsets?.bottom ?? safeAreaInsets.bottom;
  const bottomPadding = Math.max(bottomInset, 10);
  const [localActiveTab, setLocalActiveTab] = React.useState<keyof MainTabParamList | undefined>(activeTab);

  React.useEffect(() => {
    if (activeTab !== undefined) {
      setLocalActiveTab(activeTab);
    }
  }, [activeTab]);

  const tabs: TabConfig[] = [
    { name: 'Gallery', label: t.tabs.gallery, accessibilityLabel: t.tabs.galleryA11y },
    { name: 'Catch', label: t.tabs.catch, accessibilityLabel: t.tabs.catchA11y },
    { name: 'User', label: t.tabs.profile, accessibilityLabel: t.tabs.profileA11y },
  ];

  return (
    <View style={[styles.tabBar, { height: 60 + bottomPadding, paddingBottom: bottomPadding }]}>
      {tabs.map((tab) => {
        const isFocused = state
          ? state.routes[state.index]?.name === tab.name
          : (localActiveTab ?? activeTab) === tab.name;

        const handlePress = () => {
          onTabPress?.(tab.name);
          if (state && navigation) {
            const route = state.routes.find((r: any) => r.name === tab.name);
            if (route) {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }
          } else {
            setLocalActiveTab(tab.name);
            if (tab.name === 'Gallery' && rootNav.canGoBack?.()) {
              rootNav.goBack();
            } else {
              rootNav.navigate('MainTabs', { screen: tab.name });
            }
          }
        };

        // Render Hero Catch Button
        if (tab.name === 'Catch') {
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={tab.accessibilityLabel}
              onPress={handlePress}
              hitSlop={{ top: 14, bottom: 6, left: 10, right: 10 }}
              style={styles.catchTabContainer}
            >
              {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => {
                const isInteractive = pressed || Boolean(hovered);
                return (
                  <View style={styles.catchButtonWrapper}>
                    <View
                      style={[
                        styles.catchCircle,
                        isFocused && styles.catchCircleFocused,
                        isInteractive && styles.catchCircleInteractive,
                      ]}
                    >
                      <CameraIcon color="#FFFFFF" size={26} />
                    </View>
                    <Text
                      style={[
                        styles.catchLabel,
                        isFocused
                          ? styles.catchLabelActive
                          : isInteractive
                          ? styles.catchLabelInteractiveText
                          : null,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </View>
                );
              }}
            </Pressable>
          );
        }

        // Render Standard Tabs (Gallery, Profile)
        return (
          <Pressable
            key={tab.name}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={tab.accessibilityLabel}
            onPress={handlePress}
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.standardTabItem,
              (pressed || Boolean(hovered)) && styles.standardTabItemHovered,
            ]}
          >
            {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => {
              const isInteractive = pressed || Boolean(hovered);
              const iconColor = isFocused
                ? colors.pink
                : isInteractive
                ? colors.pink
                : 'rgba(74, 48, 34, 0.45)';

              return (
                <View style={styles.standardTabInner}>
                  <TabIcon name={tab.name} color={iconColor} size={24} />
                  <Text
                    style={[
                      styles.standardTabLabel,
                      isFocused && styles.standardTabLabelActive,
                      !isFocused && isInteractive && styles.standardTabLabelHovered,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </View>
              );
            }}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(74, 48, 34, 0.08)',
    paddingTop: 8,
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 10,
    overflow: 'visible',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  standardTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    borderRadius: 16,
  },
  standardTabItemHovered: {
    backgroundColor: 'rgba(74, 48, 34, 0.04)',
    opacity: 0.88,
  },
  standardTabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  standardTabLabel: {
    fontFamily: typography.medium,
    fontSize: 11,
    color: 'rgba(74, 48, 34, 0.45)',
  },
  standardTabLabelActive: {
    fontFamily: typography.bold,
    color: colors.pink,
  },
  standardTabLabelHovered: {
    fontFamily: typography.semiBold,
    color: colors.pink,
  },
  catchTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  catchButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  catchCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: colors.pink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  catchCircleFocused: {
    backgroundColor: '#D95C69',
    shadowOpacity: 0.55,
    shadowRadius: 12,
  },
  catchCircleInteractive: {
    backgroundColor: '#D65360',
    opacity: 0.95,
  },
  catchLabel: {
    fontFamily: typography.semiBold,
    fontSize: 11,
    marginTop: 3,
    color: 'rgba(74, 48, 34, 0.5)',
  },
  catchLabelActive: {
    fontFamily: typography.bold,
    color: colors.pink,
  },
  catchLabelInteractiveText: {
    fontFamily: typography.semiBold,
    color: colors.pink,
  },
});
