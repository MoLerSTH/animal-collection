import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Catch'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function CameraScreen({ navigation }: Props) {
  const cameraRef = useRef<any>(null);
  const [capturing, setCapturing] = useState(false);
  const { summary, catalog } = useCollectionStore();

  // ตรวจสอบสิทธิ์การเข้าถึงกล้อง
  const { hasPermission, requestPermission } = useCameraPermission();

  // ตรวจหาอุปกรณ์กล้อง
  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const device = backDevice ?? frontDevice;

  const caughtCount = summary.caughtCount;
  const catalogSize = summary.totalCatalog || catalog.length || 18;

  // กดปุ่มถ่ายภาพ
  const handleCapture = async () => {
    if (capturing) return;
    setCapturing(true);

    try {
      if (device && cameraRef.current) {
        const photo = await cameraRef.current.takePhoto();
        if (photo?.path) {
          const formattedUri = photo.path.startsWith('file://')
            ? photo.path
            : `file://${photo.path}`;
          navigation.navigate('AnimalDetail', { imageUri: formattedUri });
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

  // 1. กรณีผู้ใช้ยังไม่ได้ให้อนุญาตสิทธิ์กล้อง (Camera permission not granted)
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionEmoji}>📷</Text>
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>
            We need camera access to photograph animals and add them to your collection.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Grant Camera Access"
            onPress={requestPermission}
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && styles.permissionButtonPressed,
            ]}
          >
            <Text style={styles.permissionButtonText}>Grant Camera Access</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // 2. กรณีไม่มีอุปกรณ์กล้องบนเครื่องหรือ Emulator
  if (!device) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <Text style={styles.permissionEmoji}>🔍</Text>
          <Text style={styles.permissionTitle}>No Camera Device Found</Text>
          <Text style={styles.permissionText}>
            No camera device found on this device or emulator.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            onPress={handleCapture}
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && styles.permissionButtonPressed,
            ]}
          >
            <Text style={styles.permissionButtonText}>Simulate Animal Discovery</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // 3. กรณียืนยันสิทธิ์และมีอุปกรณ์กล้องพร้อมใช้งาน
  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      {/* UI Overlay */}
      <SafeAreaView style={styles.overlay}>
        {/* Header ชิดซ้ายตาม Figma Mockup */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Catch Animal</Text>
          <Text style={styles.headerSubtitle}>
            Collected: {caughtCount} / {catalogSize}
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

  // ── Permission & No Device Views ────────────────────
  permissionContainer: {
    flex: 1,
    backgroundColor: '#F8F5EF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  permissionEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A2E2B',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(58, 46, 43, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#BA796B',
    borderRadius: 9999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonPressed: {
    opacity: 0.85,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
