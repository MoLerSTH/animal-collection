import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { CATALOG_SIZE, mockAnimals } from '../data/mockAnimals';

// Conditional VisionCamera
let CameraComponent: any = null;
let useVisionCameraDevice: ((type: string) => any) | null = null;
try {
  const VisionCamera = require('react-native-vision-camera');
  CameraComponent = VisionCamera.Camera;
  useVisionCameraDevice = VisionCamera.useCameraDevice;
} catch {
  // Simulator or Expo Go fallback
}

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Catch'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function CameraScreen({ navigation }: Props) {
  const cameraRef = useRef<any>(null);
  const [capturing, setCapturing] = useState(false);

  // ตรวจหาอุปกรณ์กล้อง
  const backDevice = useVisionCameraDevice ? useVisionCameraDevice('back') : null;
  const frontDevice = useVisionCameraDevice ? useVisionCameraDevice('front') : null;
  const device = backDevice ?? frontDevice;

  const caughtCount = mockAnimals.filter((a) => !a.isLocked).length;

  // กดปุ่มถ่ายภาพ
  const handleCapture = async () => {
    if (capturing) return;
    setCapturing(true);

    try {
      if (CameraComponent && device && cameraRef.current) {
        const photo = await cameraRef.current.takePhoto();
        if (photo?.path) {
          navigation.navigate('AnimalDetail', { imageUri: `file://${photo.path}` });
          return;
        }
      }

      // ใน Simulator หรือกรณีไม่มีฮาร์ดแวร์กล้อง ให้ส่งตัวอย่างเพื่อเทส flow การบันทึกสัตว์ได้เลย
      navigation.navigate('AnimalDetail', {
        imageUri: 'https://images.unsplash.com/photo-1544985361-b421a9c1482e?w=800&auto=format&fit=crop',
      });
    } catch (err) {
      console.warn('Failed to capture photo', err);
    } finally {
      setCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Camera View / Preview */}
      {CameraComponent && device ? (
        <CameraComponent
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive
          photo
        />
      ) : (
        // ภาพ Preview สัตว์จำลองใน Simulator (ตามรูปตัวอย่างใน Figma)
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1544985361-b421a9c1482e?w=800&auto=format&fit=crop',
          }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

      {/* 2. UI Overlay */}
      <SafeAreaView style={styles.overlay}>
        {/* Header ชิดซ้ายตาม Figma Mockup */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Catch Animal</Text>
          <Text style={styles.headerSubtitle}>
            Collected {caughtCount} / {CATALOG_SIZE}
          </Text>
        </View>

        {/* Viewfinder Frame + Focus Crosshair (+) ตรงกลาง */}
        <View style={styles.viewfinderArea}>
          <View style={styles.viewfinderFrame}>
            <ViewfinderCorners />
            {/* Crosshair กลางจอ */}
            <View style={styles.crosshair}>
              <View style={styles.crosshairHorizontal} />
              <View style={styles.crosshairVertical} />
            </View>
          </View>
        </View>

        {/* Shutter Button ด้านล่าง (ก่อนถึง Tab bar) */}
        <View style={styles.shutterArea}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            onPress={handleCapture}
            style={({ pressed }) => [
              styles.shutterOuterRing,
              pressed && styles.shutterPressed,
            ]}
          >
            <View style={styles.shutterInnerCircle} />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function ViewfinderCorners() {
  return (
    <>
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
    </>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_SIZE = SCREEN_WIDTH * 0.76;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // ── Header ──────────────────────────────────────────
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(28, 25, 23, 0.65)',
  },

  // ── Viewfinder ──────────────────────────────────────
  viewfinderArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE * 1.15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Viewfinder corners ──────────────────────────────
  corner: {
    position: 'absolute',
    height: 52,
    width: 52,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderLeftWidth: 3.5,
    borderTopWidth: 3.5,
  },
  topRight: {
    top: 0,
    right: 0,
    borderRightWidth: 3.5,
    borderTopWidth: 3.5,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
  },

  // ── Focus Crosshair (+) ─────────────────────────────
  crosshair: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: 24,
    height: 2.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  crosshairVertical: {
    position: 'absolute',
    width: 2.5,
    height: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },

  // ── Shutter Button ──────────────────────────────────
  shutterArea: {
    alignItems: 'center',
    paddingBottom: 90, // เว้นระยะเหนือ Bottom Tab Bar
  },
  shutterOuterRing: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  shutterInnerCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },
});
