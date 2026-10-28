import { appStorage } from '../../core/storage/mmkv';
import { analysisUsageApi, AnalysisUsage } from '../../features/discovery/api/analysisUsageApi';
import AppIcon from '../components/AppIcon';
import { CameraIcon, SearchIcon } from '../components/CatalogIcons';
import { Hippo, typography } from '../components/Design';
import { identifyAnimalApi, AnimalAnalysisError } from '../../features/discovery/api/identifyAnimalApi';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Camera, type CameraRuntimeError, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Catch'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function CameraScreen({ navigation }: Props) {
  const userId = useAuthStore(state => state.user?.id);
  const [usage, setUsage] = useState<AnalysisUsage | null>(null);
  const consentPrompt = useRef(false);
  const cameraRef = useRef<Camera>(null);
  const previousAppState = useRef(AppState.currentState);
  const [appState, setAppState] = useState(AppState.currentState);
  const [cameraSessionId, setCameraSessionId] = useState(0);
  const [cameraError, setCameraError] = useState<CameraRuntimeError | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [front, setFront] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const [errorMessage,setErrorMessage]=useState('');
  const [errorHint, setErrorHint] = useState('Please try another photo');
  const [identified,setIdentified]=useState('');
  const [retryUntil, setRetryUntil] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const focused = useIsFocused();

  // ตรวจสอบสิทธิ์การเข้าถึงกล้อง
  const { hasPermission, requestPermission } = useCameraPermission();

  // ตรวจหาอุปกรณ์กล้อง
  const backDevice = useCameraDevice('back');
  const frontDevice = useCameraDevice('front');
  const device = front ? frontDevice : backDevice;

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active' || previousAppState.current !== 'active') {
        setCameraReady(false);
      }
      if (nextState === 'active' && previousAppState.current !== 'active') {
        // Some Android devices defer view removal until the activity resumes.
        // Always replace the old native session, even if React batches events.
        setCameraSessionId(id => id + 1);
        setCameraError(null);
      }
      previousAppState.current = nextState;
      setAppState(nextState);
    });
    return () => subscription.remove();
  }, []);

  // Tab focus stays true when the phone is locked or another app is opened.
  // Track app visibility too: Android can revoke a background camera session.
  const cameraVisible = focused && appState === 'active';

  useEffect(() => { setRetryUntil(0); setRetrySeconds(0); setError(false); }, [userId]);
  useEffect(() => {
    const update = () => setRetrySeconds(Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000)));
    update();
    if (!cameraVisible || retryUntil <= Date.now()) return;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [retryUntil, cameraVisible]);
  const retryLabel = retrySeconds >= 3600
    ? `${Math.floor(retrySeconds / 3600)}h ${Math.floor((retrySeconds % 3600) / 60)}m`
    : `${Math.floor(retrySeconds / 60)}:${String(retrySeconds % 60).padStart(2, '0')}`;

  useEffect(() => {
    let active = true;
    setUsage(null);
    if (cameraVisible && userId) void analysisUsageApi().then(value => { if (active) setUsage(value); });
    return () => { active = false; };
  }, [cameraVisible, userId]);

  const handleCameraError = (runtimeError: CameraRuntimeError) => {
    // Ignore errors from a session that is already being released.
    if (!focused || AppState.currentState !== 'active') return;
    setCameraReady(false);
    setCameraError(runtimeError);
  };

  useEffect(() => {
    if (!focused) setCameraReady(false);
  }, [focused]);

  // กดปุ่มถ่ายภาพ
  const handleCapture = async () => {
    if (capturing || !cameraVisible || cameraError || !cameraReady || !device || !cameraRef.current || retryUntil > Date.now()) return;
    const captureOwner = useAuthStore.getState().user?.id;
    const consentKey = `analysisConsent:${captureOwner || 'local_user'}`;
    if (appStorage.getString(consentKey) !== 'v1') {
      if (consentPrompt.current) return;
      consentPrompt.current = true;
      Alert.alert('ส่งภาพให้ AI วิเคราะห์', 'ภาพที่ถ่ายจะถูกส่งไปยังเซิร์ฟเวอร์ของ Animal Collection และบริการ AI ภายนอกเพื่อระบุสัตว์ โปรดหลีกเลี่ยงภาพที่มีข้อมูลส่วนตัว', [
        {text: 'ยกเลิก', style: 'cancel', onPress: () => {consentPrompt.current = false;}},
        {text: 'อ่านรายละเอียด', onPress: () => {consentPrompt.current = false; navigation.navigate('Privacy');}},
        {text: 'ยอมรับและถ่าย', onPress: () => {consentPrompt.current = false; if (useAuthStore.getState().user?.id !== captureOwner) return; appStorage.set(consentKey, 'v1'); void handleCapture();}},
      ], {cancelable: true, onDismiss: () => {consentPrompt.current = false;}});
      return;
    }
    setCapturing(true);
    setRequiresSignIn(false);
    setIdentified('');

    let formattedUri: string;
    let capturedAt: string;
    try {
      const photo = await cameraRef.current.takePhoto({ flash: flash && device.hasFlash ? 'on' : 'off' });
      if (!photo?.path) throw new Error('Camera returned no photo');
      capturedAt = new Date().toISOString();
      formattedUri = photo.path.startsWith('file://') ? photo.path : `file://${photo.path}`;
    } catch (captureError) {
      const code = captureError && typeof captureError === 'object' && 'code' in captureError
        ? String(captureError.code) : '';
      console.warn('Failed to capture photo', captureError);
      setErrorMessage(code === 'session/camera-not-ready'
        ? 'The camera is not ready yet. Please try again.'
        : 'Could not capture photo. Please try again.');
      setErrorHint('Keep the camera open and wait for the preview before taking a photo.');
      setError(true);
      setCapturing(false);
      return;
    }

    try {
      const token = useAuthStore.getState().tokens?.accessToken;
      const result = await identifyAnimalApi(formattedUri, token);
      if (useAuthStore.getState().user?.id !== captureOwner) return;
      if (!result.found) {
        setErrorMessage('No animal found - Try another photo');
        setErrorHint('Move closer and keep the animal in focus.');
        setError(true);
        return;
      }
      setIdentified(result.species);
      navigation.navigate('AnimalDetail', {
        imageUri: formattedUri,
        identifiedSpecies: result.species,
        identifiedStory: result.story,
        animalType: result.animalType,
        habitatTags: result.habitatTags,
        capturedAt,
      });
    } catch (analysisError) {
      if (useAuthStore.getState().user?.id !== captureOwner) return;
      const expiredSession = analysisError instanceof AnimalAnalysisError &&
        (analysisError.status === 401 || analysisError.status === 403);
      setRequiresSignIn(expiredSession);
      setErrorMessage(analysisError instanceof Error ? analysisError.message : 'Animal analysis is unavailable. Please try again.');
      const quota = analysisError instanceof AnimalAnalysisError ? analysisError.quota : undefined;
      if (quota?.retryAfterSeconds) setRetryUntil(Date.now() + quota.retryAfterSeconds * 1000);
      const dailyReset = (quota?.code?.endsWith('_daily_limit') || quota?.code?.endsWith('_weekly_limit')) && quota.resetsAt;
      setErrorHint(expiredSession ? 'Sign in to connect your account to the analysis service.'
        : dailyReset ? `Try again after ${new Date(dailyReset).toLocaleString('en-GB', {timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'})} Thailand time.`
        : quota?.code ? 'This rejected request did not use your daily allowance. Wait for the timer before trying again.'
        : 'Your photo was captured, but could not be analyzed.');
      setError(true);
    } finally {
      setCapturing(false);
      if (captureOwner && useAuthStore.getState().user?.id === captureOwner) {
        void analysisUsageApi().then(value => { if (useAuthStore.getState().user?.id === captureOwner) setUsage(value); });
      }
    }
  };

  // 1. กรณีผู้ใช้ยังไม่ได้ให้อนุญาตสิทธิ์กล้อง (Camera permission not granted)
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <View style={{marginBottom: 16}}><CameraIcon color="#E06D79" size={48}/></View>
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
          <View style={{marginBottom: 16}}><SearchIcon color="#E06D79" size={48}/></View>
          <Text style={styles.permissionTitle}>No Camera Device Found</Text>
          <Text style={styles.permissionText}>
            No camera device found on this device or emulator.
          </Text>

        </View>
      </SafeAreaView>
    );
  }

  if (cameraError) {
    const restricted = cameraError.code === 'system/camera-is-restricted';
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <View style={{ marginBottom: 16 }}><CameraIcon color="#E06D79" size={48} /></View>
          <Text style={styles.permissionTitle}>
            {restricted ? 'Camera access restricted' : 'Camera unavailable'}
          </Text>
          <Text style={styles.permissionText}>
            {restricted
              ? 'Android stopped the camera. Return to the app and try again. If this continues, check camera access in Settings.'
              : 'The camera could not start. Close other camera apps and try again.'}
          </Text>
          <Pressable accessibilityRole="button" style={styles.permissionButton} onPress={() => setCameraError(null)}>
            <Text style={styles.permissionButtonText}>Retry Camera</Text>
          </Pressable>
          {restricted && (
            <Pressable accessibilityRole="button" style={{ padding: 16 }} onPress={() => {
              void Linking.openSettings().catch(() => {
                Alert.alert('Camera settings', 'Open Settings > Apps > Animal Collection > Permissions > Camera.');
              });
            }}>
              <Text style={styles.permissionButtonTextSecondary}>Open Settings</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // 3. กรณียืนยันสิทธิ์และมีอุปกรณ์กล้องพร้อมใช้งาน
  return (
    <View style={styles.container}>
      {cameraVisible && <Camera
        key={cameraSessionId}
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={cameraVisible && !error}
        photo={true}
        onError={handleCameraError}
        onPreviewStarted={() => setCameraReady(true)}
        onPreviewStopped={() => setCameraReady(false)}
      />}

      {/* UI Overlay */}
      <SafeAreaView style={styles.overlay}>
        <View style={{flexDirection:'row',justifyContent:'flex-end',gap:12,padding:20}}>
          <Pressable accessibilityLabel="Toggle flash" disabled={!device.hasFlash} onPress={()=>setFlash(!flash)} style={{backgroundColor:'#00000066',padding:12,borderRadius:30}}><AppIcon name="flash" color={flash?'#EDB64E':'white'} size={24}/></Pressable>
          <Pressable accessibilityLabel="Switch camera" disabled={capturing||!frontDevice||!backDevice} onPress={()=>{setCameraReady(false);setFront(!front);}} style={{backgroundColor:'#00000066',padding:12,borderRadius:30}}><AppIcon name="switch-camera" color="white" size={24}/></Pressable>
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

        {!!usage && <Text style={{fontFamily: typography.medium, color: 'white', textAlign: 'center', backgroundColor: '#00000099', padding: 8}}>AI remaining: {usage.remaining}/{usage.limit} · resets {new Date(usage.resetsAt).toLocaleString('en-GB', {weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok'})} TH</Text>}
        {retrySeconds > 0 && <Text style={{fontFamily: typography.medium, color: 'white', textAlign: 'center', backgroundColor: '#00000099', padding: 8}}>Try again in {retryLabel}</Text>}
        {/* Shutter Button ด้านล่าง (ก่อนถึง Tab bar) */}
        {capturing&&<View style={{alignSelf:'center',backgroundColor:'#00000099',borderRadius:24,padding:14,flexDirection:'row',gap:10}}><ActivityIndicator color="#E06D79"/><Text style={{fontFamily: typography.semiBold, color:'white'}}>AI Analyzing...</Text></View>}
        {!!identified&&<View style={{alignSelf:'center',backgroundColor:'#FBE1DE',borderRadius:20,padding:10,flexDirection:'row',alignItems:'center',gap:6}}><Text style={{fontFamily: typography.bold, color: '#4A3022'}}>{identified}</Text>{/hippo/i.test(identified)&&<><AppIcon name="crown" size={18}/><Text style={{fontFamily: typography.bold, color: '#4A3022'}}>Legendary</Text></>}</View>}
        <View style={styles.shutterArea}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            disabled={capturing || !cameraVisible || !cameraReady || retrySeconds > 0}
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
      <Modal visible={error} transparent animationType="fade" onRequestClose={()=>setError(false)}>
        <View style={{flex:1,backgroundColor:'#00000099',justifyContent:'center',padding:32}}>
          <View style={styles.permissionCard}>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss camera error" onPress={()=>setError(false)} style={{position: 'absolute', top:12, right:12, padding:6}}><AppIcon name="close" size={18}/></Pressable>
            <Hippo size={150} magnifier/>
            <Text style={styles.permissionTitle}>{errorMessage}</Text>
            <Text style={styles.permissionText}>{errorHint}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={requiresSignIn ? 'Sign in again' : retrySeconds > 0 ? 'Waiting for analysis service' : 'Try Again'} disabled={!requiresSignIn && retrySeconds > 0} style={[styles.permissionButton, retrySeconds > 0 && {opacity: 0.6}]} onPress={() => {
              setError(false);
              if (requiresSignIn) navigation.navigate('Login');
            }}>
              <Text style={styles.permissionButtonText}>{requiresSignIn ? 'Sign in again' : retrySeconds > 0 ? `Try again in ${retryLabel}` : 'Try Again'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    fontFamily: typography.extraBold,
    fontSize: 26,

    color: '#1C1917',
    letterSpacing: -0.5,
  },
  headerSubtitle: {

    marginTop: 2,

    fontFamily: typography.regular,
    fontSize: 14,

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
    paddingBottom: 24, // เว้นระยะเหนือ Bottom Tab Bar
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
    backgroundColor: '#E06D79',
  },
  shutterPressed: {
    transform: [{ scale: 0.94 }],
    opacity: 0.85,
  },

  // ── Permission & No Device Views ────────────────────
  permissionContainer: {
    flex: 1,
    backgroundColor: '#FDF8F2',
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
    fontFamily: typography.bold,
    fontSize: 20,

    color: '#4A3022',
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {

    fontFamily: typography.regular,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(58, 46, 43, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#E06D79',
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
    fontFamily: typography.semiBold,
    fontSize: 16,

  },
  permissionButtonTextSecondary: {
    color: '#4A3022',
    fontFamily: typography.semiBold,
    fontSize: 16,

  },
});
