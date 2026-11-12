jest.mock('../../../features/discovery/api/analysisUsageApi', () => ({analysisUsageApi: async () => null}));
import { appStorage } from '../../../core/storage/mmkv';
import { useAuthStore } from '../../../features/auth/stores/useAuthStore';
import * as captureFiles from '../../../features/collections/stores/captureFiles';
import { useAnalysisCooldownStore } from '../../../features/discovery/stores/useAnalysisCooldownStore';
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
    appStorage.delete('camera_permission_granted');
    appStorage.set(`analysisConsent:${useAuthStore.getState().user?.id || 'local_user'}`, 'v1');
    useAnalysisCooldownStore.setState({ ownerId: undefined, retryUntil: 0 });
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
    globalThis.fetch = jest.fn();
    const { navigation } = renderScreen();

    fireEvent.press(screen.getByLabelText('Capture photo'));

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('AnimalDetail', {
        imageUri: expect.stringMatching(/^file:\/\/\/documents\/pending-captures\/.+\.jpg$/),
        capturedAt: expect.any(String),
        autoAnalyze: true,
        captureOwner: useAuthStore.getState().user?.id,
      });
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('shows the shared-service cooldown and blocks capture until retry is allowed', async () => {
    jest.useFakeTimers();
    try {
      useAnalysisCooldownStore.getState().setCooldown(2, useAuthStore.getState().user?.id);
      renderScreen();
      expect(screen.getByText('Try again in 0:02')).toBeTruthy();
      expect(screen.getByLabelText('Capture photo')).toBeDisabled();
      fireEvent.press(screen.getByLabelText('Capture photo'));
      expect(mockTakePhoto).not.toHaveBeenCalled();
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

  it('syncs cooldown owner when the signed-in user changes', () => {
    const originalUser = useAuthStore.getState().user;
    const originalTokens = useAuthStore.getState().tokens;
    jest.useFakeTimers();
    try {
      useAuthStore.setState({ user: { id: 'user-a', name: 'A', email: 'a@example.com' }, tokens: { accessToken: 'tok-a' } });
      useAnalysisCooldownStore.getState().setCooldown(30, 'user-a');
      renderScreen();
      expect(screen.getByText('Try again in 0:30')).toBeTruthy();
      expect(screen.getByLabelText('Capture photo')).toBeDisabled();

      act(() => {
        useAuthStore.setState({ user: { id: 'user-b', name: 'B', email: 'b@example.com' }, tokens: { accessToken: 'tok-b' } });
      });
      expect(screen.queryByText(/Try again in/)).toBeNull();
      expect(screen.getByLabelText('Capture photo')).toBeEnabled();
      screen.unmount();
    } finally {
      jest.useRealTimers();
      useAuthStore.setState({ user: originalUser, tokens: originalTokens });
    }
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

  it('shows a capture error modal and skips navigation if staging the photo fails', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(captureFiles, 'stagePendingCapture').mockImplementationOnce(() => {
      throw new Error('Could not read the captured photo.');
    });
    const { navigation } = renderScreen();
    fireEvent.press(screen.getByLabelText('Capture photo'));
    await waitFor(() => expect(screen.getByText('Could not capture photo. Please try again.')).toBeTruthy());
    expect(navigation.navigate).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Try Again' }));
    expect(screen.queryByText('Could not capture photo. Please try again.')).toBeNull();
    warning.mockRestore();
  });
});

it('does not require manual permission prompt again when camera permission was previously granted', async () => {
  const requestPermission = jest.fn().mockResolvedValue(true);
  appStorage.set('camera_permission_granted', 'true');
  jest.mocked(useCameraPermission).mockReturnValue({
    hasPermission: false,
    requestPermission,
  } as any);

  renderScreen();

  await waitFor(() => {
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Grant Camera Access' })).toBeNull();
  });
});
