import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import SpeedDialFab from '../SpeedDialFab';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

describe('SpeedDialFab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders collapsed main FAB with plus icon by default', () => {
    render(<SpeedDialFab />);
    const mainButton = screen.getByTestId('speed-dial-main-button');
    expect(mainButton).toBeTruthy();
    expect(mainButton.props.accessibilityState).toEqual({ expanded: false });
    expect(mainButton.props.accessibilityLabel).toBe('Add animal photo manually');
  });

  it('expands when main button is tapped, revealing Camera and Gallery sub-buttons', () => {
    render(<SpeedDialFab />);
    const mainButton = screen.getByTestId('speed-dial-main-button');

    fireEvent.press(mainButton);

    expect(mainButton.props.accessibilityState).toEqual({ expanded: true });
    expect(mainButton.props.accessibilityLabel).toBe('Close add menu');
    expect(screen.getByText('Take Photo')).toBeTruthy();
    expect(screen.getByText('Choose Photo')).toBeTruthy();
    expect(screen.getAllByLabelText('Take photo with camera').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText('Choose photo from gallery').length).toBeGreaterThanOrEqual(1);
  });

  it('collapses when main button is tapped again in expanded state', () => {
    render(<SpeedDialFab />);
    const mainButton = screen.getByTestId('speed-dial-main-button');

    // Open
    fireEvent.press(mainButton);
    expect(mainButton.props.accessibilityState).toEqual({ expanded: true });

    // Close
    fireEvent.press(mainButton);
    expect(mainButton.props.accessibilityState).toEqual({ expanded: false });
  });

  it('collapses when the backdrop is pressed', () => {
    render(<SpeedDialFab />);
    const mainButton = screen.getByTestId('speed-dial-main-button');

    // Open
    fireEvent.press(mainButton);
    expect(mainButton.props.accessibilityState).toEqual({ expanded: true });

    // Press backdrop
    const backdrop = screen.getByLabelText('Close speed dial menu');
    fireEvent.press(backdrop);
    expect(mainButton.props.accessibilityState).toEqual({ expanded: false });
  });

  it('launches standard camera without AI, navigates to AnimalDetail, and auto-closes', async () => {
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValueOnce({
      status: ImagePicker.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///manual-photo.jpg', width: 800, height: 600 }],
    });

    render(<SpeedDialFab />);
    const mainButton = screen.getByTestId('speed-dial-main-button');

    // Expand menu
    fireEvent.press(mainButton);

    // Tap camera button
    const cameraButtons = screen.getAllByLabelText('Take photo with camera');
    await act(async () => {
      fireEvent.press(cameraButtons[0]);
    });

    await waitFor(() => {
      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        allowsEditing: false,
        quality: 0.85,
      });
      expect(mockNavigate).toHaveBeenCalledWith('AnimalDetail', {
        imageUri: 'file:///manual-photo.jpg',
        capturedAt: expect.any(String),
      });
    });

    // Auto-closed
    expect(mainButton.props.accessibilityState).toEqual({ expanded: false });
  });

  it('launches native gallery picker, navigates to AnimalDetail, and auto-closes', async () => {
    jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValueOnce({
      status: ImagePicker.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///gallery-selection.jpg', width: 1024, height: 768 }],
    });

    render(<SpeedDialFab />);
    const mainButton = screen.getByTestId('speed-dial-main-button');

    // Expand menu
    fireEvent.press(mainButton);

    // Tap gallery button
    const galleryButtons = screen.getAllByLabelText('Choose photo from gallery');
    await act(async () => {
      fireEvent.press(galleryButtons[0]);
    });

    await waitFor(() => {
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        allowsEditing: false,
        quality: 0.85,
      });
      expect(mockNavigate).toHaveBeenCalledWith('AnimalDetail', {
        imageUri: 'file:///gallery-selection.jpg',
        capturedAt: expect.any(String),
      });
    });

    // Auto-closed
    expect(mainButton.props.accessibilityState).toEqual({ expanded: false });
  });

  it('invokes custom onImageSelected callback when provided', async () => {
    const onImageSelected = jest.fn();
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'file:///custom-callback.jpg', width: 500, height: 500 }],
    });

    render(<SpeedDialFab onImageSelected={onImageSelected} />);
    fireEvent.press(screen.getByTestId('speed-dial-main-button'));

    const galleryButtons = screen.getAllByLabelText('Choose photo from gallery');
    await act(async () => {
      fireEvent.press(galleryButtons[0]);
    });

    await waitFor(() => {
      expect(onImageSelected).toHaveBeenCalledWith('file:///custom-callback.jpg');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('alerts when camera permissions are denied', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValueOnce({
      status: ImagePicker.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
      expires: 'never',
    });

    render(<SpeedDialFab />);
    fireEvent.press(screen.getByTestId('speed-dial-main-button'));

    const cameraButtons = screen.getAllByLabelText('Take photo with camera');
    await act(async () => {
      fireEvent.press(cameraButtons[0]);
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Camera Access Required',
        expect.stringContaining('Please enable camera permissions')
      );
      expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    });
  });
});
