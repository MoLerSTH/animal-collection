jest.mock('../../../features/discovery/api/analysisUsageApi', () => ({analysisUsageApi: async () => null}));
import { appStorage } from '../../../core/storage/mmkv';
import { useAuthStore } from '../../../features/auth/stores/useAuthStore';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AppState, type AppStateStatus, Linking, Alert } from 'react-native';
import { Camera, useCameraPermission, useCameraDevice } from 'react-native-vision-camera';
import CameraScreen from '../CameraScreen';

const mockTakePhoto: jest.Mock = require('react-native-vision-camera').mockTakePhoto;

function renderScreen(cameraReady = true) {
  const navigation = { navigate: jest.fn() } as any;
  const route = { key: 'Catch', name: 'Catch' } as any;
  render(<CameraScreen navigation={navigation} route={route} />);
  const camera = screen.UNSAFE_queryByType(Camera);
  if (camera && cameraReady) fireEvent(camera, 'previewStarted');
  return { navigation };
}

describe('CameraScreen', () => {
  let changeAppState: (state: AppStateStatus) => void;
  let removeAppStateListener: jest.Mock;

  beforeEach(() => {
    appStorage.set(`analysisConsent:${useAuthStore.getState().user?.id || 'local_user'}`, 'v1');
    AppState.currentState = 'active';
    removeAppStateListener = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      changeAppState = state => {
        AppState.currentState = state;
        listener(state);
      };
      return { remove: removeAppStateListener };
    });
  });

  afterEach(() => {
    AppState.currentState = 'active';
    jest.restoreAllMocks();
    mockTakePhoto.mockClear();
    jest.mocked(useCameraPermission).mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn(),
    } as any);
    jest.mocked(useCameraDevice).mockReturnValue({ id: 'mock-back-camera', position: 'back' } as any);
  });

  it('asks before sending the first photo to external AI', () => {
    appStorage.delete(`analysisConsent:${useAuthStore.getState().user?.id || 'local_user'}`);
    const alert = jest.spyOn(Alert, 'alert');
    renderScreen();
    fireEvent.press(screen.getByLabelText('Capture photo'));
    expect(alert).toHaveBeenCalledWith('ส่งภาพให้ AI วิเคราะห์', expect.any(String), expect.any(Array), expect.any(Object));
    expect(mockTakePhoto).not.toHaveBeenCalled();
  });

  it('shows a permission prompt when camera access has not been granted', () => {
    jest.mocked(useCameraPermission).mockReturnValue({
      hasPermission: false,
      requestPermission: jest.fn(),
    } as any);

    renderScreen();

    expect(screen.getByText(/We need camera access/)).toBeTruthy();
  });

  it('calls requestPermission when the grant-access button is tapped', () => {
    const requestPermission = jest.fn();
    jest.mocked(useCameraPermission).mockReturnValue({ hasPermission: false, requestPermission } as any);

    renderScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Grant Camera Access' }));

    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('shows a no-device message when useCameraDevice returns undefined', () => {
    jest.mocked(useCameraDevice).mockReturnValue(undefined as any);

    renderScreen();

    expect(screen.getByText(/No camera device found/)).toBeTruthy();
  });

  it('renders the viewfinder and collected count once permission and device are available', () => {
    renderScreen();

    expect(screen.getByLabelText('Toggle flash')).toBeTruthy();
    expect(screen.getByLabelText('Switch camera')).toBeTruthy();
    expect(screen.queryByText('Upload')).toBeNull();
  });

  it('navigates to AnimalDetail with the captured photo path on shutter press', async () => {
    globalThis.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({found:true,species:'Cat',story:'A domestic cat.',animalType:'Mammal',habitatTags:[]})});
    const { navigation } = renderScreen();

    fireEvent.press(screen.getByLabelText('Capture photo'));

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('AnimalDetail', {
        imageUri: 'file:///tmp/mock-photo.jpg', identifiedSpecies:'Cat', identifiedStory:'A domestic cat.',
        animalType: 'Mammal', habitatTags: [], capturedAt: expect.any(String),
      });
    });
  });

  it('shows the shared-service cooldown and blocks capture until retry is allowed', async () => {
    jest.useFakeTimers();
    try {
      globalThis.fetch = jest.fn().mockResolvedValue({ok: false, status: 429,
        headers: new Headers({'Retry-After': '2'}),
        json: async () => ({detail: {code: 'service_busy', retryAfterSeconds: 2}}),
      });
      renderScreen();
      await act(async () => { fireEvent.press(screen.getByLabelText('Capture photo')); });
      expect(screen.getByText('The analysis service is busy. Please wait a moment.')).toBeTruthy();
      expect(screen.getByText(/did not use your daily allowance/)).toBeTruthy();
      expect(screen.getByRole('button', {name: 'Waiting for analysis service'})).toBeDisabled();
      expect(screen.getByLabelText('Capture photo')).toBeDisabled();
      fireEvent.press(screen.getByRole('button', {name: 'Dismiss camera error'}));
      fireEvent.press(screen.getByLabelText('Capture photo'));
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
      await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
      expect(screen.getByText('Try again in 0:01')).toBeTruthy();
      await act(async () => { await jest.advanceTimersByTimeAsync(1000); });
      expect(screen.queryByText(/Try again in/)).toBeNull();
      expect(screen.getByLabelText('Capture photo')).toBeEnabled();
      screen.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('discards an analysis response if the account changes while it is pending', async () => {
    const originalUser = useAuthStore.getState().user;
    const originalTokens = useAuthStore.getState().tokens;
    useAuthStore.setState({user: {id: 'capture-owner-a', name: 'A', email: 'a@example.com'}, tokens: {accessToken: 'session-a'}});
    appStorage.set('analysisConsent:capture-owner-a', 'v1');
    let finish!: (value: unknown) => void;
    globalThis.fetch = jest.fn().mockImplementation(() => new Promise(resolve => {finish = resolve;}));
    const {navigation} = renderScreen();
    fireEvent.press(screen.getByLabelText('Capture photo'));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    useAuthStore.setState({user: {id: 'capture-owner-b', name: 'B', email: 'b@example.com'}});
    await act(async () => {finish({ok: true, json: async () => ({found: true, species: 'Cat', story: 'Cat'})});});
    await waitFor(() => expect(screen.getByLabelText('Capture photo')).toBeEnabled());
    expect(navigation.navigate).not.toHaveBeenCalled();
    useAuthStore.setState({user: originalUser, tokens: originalTokens});
  });

  it('releases the camera in the background and reopens it on returning to the app', () => {
    renderScreen();
    expect(screen.UNSAFE_getByType(Camera)).toBeTruthy();

    act(() => changeAppState('background'));
    expect(screen.UNSAFE_queryByType(Camera)).toBeNull();
    expect(screen.getByLabelText('Capture photo')).toBeDisabled();

    act(() => changeAppState('active'));
    expect(screen.UNSAFE_getByType(Camera)).toBeTruthy();
    expect(screen.getByLabelText('Capture photo')).toBeDisabled();
    fireEvent(screen.UNSAFE_getByType(Camera), 'previewStarted');
    expect(screen.getByLabelText('Capture photo')).toBeEnabled();

    screen.unmount();
    expect(removeAppStateListener).toHaveBeenCalled();
  });

  it('offers recovery when Android restricts the camera and remounts on retry', () => {
    renderScreen();
    fireEvent(screen.UNSAFE_getByType(Camera), 'error', { code: 'system/camera-is-restricted' });

    expect(screen.getByText('Camera access restricted')).toBeTruthy();
    expect(screen.UNSAFE_queryByType(Camera)).toBeNull();
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    fireEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
    expect(openSettings).toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Retry Camera' }));
    expect(screen.queryByText('Camera access restricted')).toBeNull();
    expect(screen.UNSAFE_getByType(Camera)).toBeTruthy();
  });

  it('ignores late native errors while releasing a background camera session', () => {
    renderScreen();
    const onError = screen.UNSAFE_getByType(Camera).props.onError;
    act(() => {
      changeAppState('background');
      onError({ code: 'system/camera-is-restricted' });
    });
    act(() => changeAppState('active'));
    expect(screen.queryByText('Camera access restricted')).toBeNull();
    expect(screen.UNSAFE_getByType(Camera)).toBeTruthy();
  });

  it('replaces a stale session when background and resume events are batched', () => {
    renderScreen();
    const oldSession = screen.UNSAFE_getByType(Camera);
    act(() => {
      changeAppState('background');
      changeAppState('active');
    });
    expect(screen.UNSAFE_getByType(Camera)).not.toBe(oldSession);
  });

  it('waits for a camera preview before allowing a capture', () => {
    renderScreen(false);
    fireEvent.press(screen.getByLabelText('Capture photo'));
    expect(mockTakePhoto).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Capture photo')).toBeDisabled();
    fireEvent(screen.UNSAFE_getByType(Camera), 'previewStarted');
    expect(screen.getByLabelText('Capture photo')).toBeEnabled();
  });

  it('distinguishes a failed analysis connection from a failed photo capture', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const { navigation } = renderScreen();
    fireEvent.press(screen.getByLabelText('Capture photo'));
    await waitFor(() => expect(screen.getByText(/Cannot reach the analysis service/)).toBeTruthy());
    expect(screen.getByText('Your photo was captured, but could not be analyzed.')).toBeTruthy();
    expect(screen.queryByText(/Could not capture photo/)).toBeNull();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('does not upload or analyze anything when the camera fails to take a photo', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    globalThis.fetch = jest.fn();
    mockTakePhoto.mockRejectedValueOnce({ code: 'session/camera-not-ready' });
    renderScreen();
    fireEvent.press(screen.getByLabelText('Capture photo'));
    await waitFor(() => expect(screen.getByText('The camera is not ready yet. Please try again.')).toBeTruthy());
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(screen.queryByText(/Your photo was captured/)).toBeNull();
    warning.mockRestore();
  });

  it.each([401, 403])('offers a working sign-in action for HTTP %s instead of retrying an invalid session', async status => {
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: false, status });
    const { navigation } = renderScreen();
    fireEvent.press(screen.getByLabelText('Capture photo'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in again' })).toBeTruthy());
    fireEvent.press(screen.getByRole('button', { name: 'Sign in again' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Login');
  });
});

it('keeps an unrecognized photo out of the collection and offers retry', async()=>{
 globalThis.fetch=jest.fn().mockResolvedValue({ok:true,json:async()=>({found:false,species:'',story:''})});
 const {navigation}=renderScreen();
 fireEvent.press(screen.getByLabelText('Capture photo'));
 await waitFor(()=>expect(screen.getByText('No animal found - Try another photo')).toBeTruthy());
 expect(navigation.navigate).not.toHaveBeenCalled();
 fireEvent.press(screen.getByRole('button',{name:'Try Again'}));
 expect(screen.queryByText('No animal found - Try another photo')).toBeNull();
});
