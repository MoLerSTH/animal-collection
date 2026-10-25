import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Easing,
  Alert,
  StyleProp,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { CameraIcon, GalleryIcon } from './CatalogIcons';
import { colors, typography } from './Design';
import { useTranslation } from '../../core/i18n/useLanguageStore';

function PlusIcon({ color = '#FFFFFF', size = 26 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5 V19 M5 12 H19"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export interface SpeedDialFabProps {
  onImageSelected?: (uri: string) => void;
  style?: StyleProp<ViewStyle>;
}

const FAB_SIZE = 56;
const SUB_BUTTON_SIZE = 44;
const SPACING = 12;

/**
 * Minimalist Expandable Speed Dial Floating Action Button (FAB).
 * Expands into standard camera (without AI) and native gallery picker.
 * Features 100% mathematically centered vertical alignment and edge-safe responsive positioning.
 */
export default function SpeedDialFab({ onImageSelected, style }: SpeedDialFabProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);

  // Responsive edge-safe offsets
  const bottomOffset = Math.max(insets.bottom + 16, 24);
  const rightOffset = Math.max(insets.right + 16, 20);
  const rowWidth = Math.min(windowWidth - rightOffset - 16, 280);
  const maxLabelWidth = rowWidth - FAB_SIZE - 16;

  // Animation values
  const animation = useRef(new Animated.Value(0)).current;
  const sub1Anim = useRef(new Animated.Value(0)).current;
  const sub2Anim = useRef(new Animated.Value(0)).current;

  const expand = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(animation, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.stagger(45, [
        Animated.spring(sub1Anim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(sub2Anim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const collapse = (onFinished?: () => void) => {
    setIsOpen(false);
    Animated.parallel([
      Animated.timing(animation, {
        toValue: 0,
        duration: 180,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.stagger(30, [
        Animated.timing(sub2Anim, {
          toValue: 0,
          duration: 160,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(sub1Anim, {
          toValue: 0,
          duration: 160,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onFinished?.();
    });
  };

  const toggle = () => {
    if (isOpen) {
      collapse();
    } else {
      expand();
    }
  };

  const handleLaunchCamera = async () => {
    collapse(async () => {
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Camera Access Required',
            'Please enable camera permissions in settings to take animal photos.'
          );
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.85,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
          const uri = result.assets[0].uri;
          if (onImageSelected) {
            onImageSelected(uri);
          } else {
            navigation.navigate('AnimalDetail', {
              imageUri: uri,
              capturedAt: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.warn('[SpeedDialFab] Camera error:', err);
      }
    });
  };

  const handleLaunchGallery = async () => {
    collapse(async () => {
      try {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Photo Library Access Required',
            'Please enable photo library permissions in settings to select animal photos.'
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          quality: 0.85,
        });

        if (!result.canceled && result.assets?.[0]?.uri) {
          const uri = result.assets[0].uri;
          if (onImageSelected) {
            onImageSelected(uri);
          } else {
            navigation.navigate('AnimalDetail', {
              imageUri: uri,
              capturedAt: new Date().toISOString(),
            });
          }
        }
      } catch (err) {
        console.warn('[SpeedDialFab] Gallery picker error:', err);
      }
    });
  };

  // Interpolations
  const rotation = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const backdropOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Vertical offsets: Sub-Button 1 is positioned exactly above main FAB
  const offset1 = -(FAB_SIZE + SPACING);
  const sub1TranslateY = sub1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, offset1],
  });
  const sub1Scale = sub1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  });
  const sub1Opacity = sub1Anim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  // Sub-Button 2 is positioned above Sub-Button 1
  const offset2 = -(FAB_SIZE + SPACING + FAB_SIZE + SPACING);
  const sub2TranslateY = sub2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, offset2],
  });
  const sub2Scale = sub2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 1],
  });
  const sub2Opacity = sub2Anim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.5, 1],
  });

  return (
    <View style={[styles.rootContainer, style]} pointerEvents="box-none">
      {/* Semi-transparent Dimming Backdrop */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.backdrop,
          { opacity: backdropOpacity },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close speed dial menu"
          onPress={() => collapse()}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* FAB and Sub-Actions Container */}
      <View
        style={[
          styles.fabWrapper,
          {
            bottom: bottomOffset,
            right: rightOffset,
          },
        ]}
        pointerEvents="box-none"
      >
        {/* Sub-Button 2: Gallery Picker */}
        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[
            styles.subActionRow,
            {
              width: rowWidth,
              transform: [{ translateY: sub2TranslateY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.labelWrapper,
              {
                opacity: sub2Opacity,
                transform: [{ scale: sub2Scale }],
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.gallery.chooseGalleryA11y}
              onPress={handleLaunchGallery}
              style={({ pressed }) => [
                styles.labelPill,
                { maxWidth: maxLabelWidth },
                pressed && styles.labelPillPressed,
              ]}
            >
              <Text numberOfLines={1} style={styles.labelText}>{t.gallery.chooseGallery}</Text>
            </Pressable>
          </Animated.View>

          {/* Sub-button Anchor: Exactly 56px wide, perfectly aligning sub-button center with main FAB */}
          <View style={styles.subButtonAnchor}>
            <Animated.View
              style={{
                opacity: sub2Opacity,
                transform: [{ scale: sub2Scale }],
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.gallery.chooseGalleryA11y}
                onPress={handleLaunchGallery}
                style={({ pressed }) => [
                  styles.subButtonCircle,
                  pressed && styles.subButtonPressed,
                ]}
              >
                <GalleryIcon color={colors.pink} size={22} />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Sub-Button 1: Standard Camera */}
        <Animated.View
          pointerEvents={isOpen ? 'auto' : 'none'}
          style={[
            styles.subActionRow,
            {
              width: rowWidth,
              transform: [{ translateY: sub1TranslateY }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.labelWrapper,
              {
                opacity: sub1Opacity,
                transform: [{ scale: sub1Scale }],
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.gallery.takePhotoA11y}
              onPress={handleLaunchCamera}
              style={({ pressed }) => [
                styles.labelPill,
                { maxWidth: maxLabelWidth },
                pressed && styles.labelPillPressed,
              ]}
            >
              <Text numberOfLines={1} style={styles.labelText}>{t.gallery.takePhoto}</Text>
            </Pressable>
          </Animated.View>

          {/* Sub-button Anchor: Exactly 56px wide, perfectly aligning sub-button center with main FAB */}
          <View style={styles.subButtonAnchor}>
            <Animated.View
              style={{
                opacity: sub1Opacity,
                transform: [{ scale: sub1Scale }],
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t.gallery.takePhotoA11y}
                onPress={handleLaunchCamera}
                style={({ pressed }) => [
                  styles.subButtonCircle,
                  pressed && styles.subButtonPressed,
                ]}
              >
                <CameraIcon color={colors.pink} size={22} />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Main Floating Action Button Anchor */}
        <View style={styles.mainFabAnchor}>
          <Pressable
            testID="speed-dial-main-button"
            accessibilityRole="button"
            accessibilityLabel={isOpen ? t.gallery.closeMenuA11y : t.gallery.addMenuA11y}
            accessibilityState={{ expanded: isOpen }}
            onPress={toggle}
            style={({ pressed }) => [
              styles.mainFab,
              pressed && styles.mainFabPressed,
            ]}
          >
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
              <PlusIcon color="#FFFFFF" size={26} />
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(48, 24, 13, 0.32)',
  },
  fabWrapper: {
    position: 'absolute',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  mainFabAnchor: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainFab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  mainFabPressed: {
    backgroundColor: '#D65360',
    transform: [{ scale: 0.94 }],
  },
  subActionRow: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  labelWrapper: {
    marginRight: 8,
    flexShrink: 0,
  },
  subButtonAnchor: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  subButtonCircle: {
    width: SUB_BUTTON_SIZE,
    height: SUB_BUTTON_SIZE,
    borderRadius: SUB_BUTTON_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
  },
  subButtonPressed: {
    backgroundColor: '#FAF5ED',
    transform: [{ scale: 0.92 }],
  },
  labelPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.06)',
    flexShrink: 0,
  },
  labelPillPressed: {
    backgroundColor: '#FAF5ED',
    opacity: 0.9,
  },
  labelText: {
    fontFamily: typography.bold,
    fontSize: 13,

    color: colors.ink,
    letterSpacing: -0.2,
    flexShrink: 0,
  },
});
