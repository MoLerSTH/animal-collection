import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useCameraPermission, useCameraDevice } from 'react-native-vision-camera';
import CameraScreen from '../CameraScreen';

function renderScreen() {
  const navigation = { navigate: jest.fn() } as any;
  const route = { key: 'Catch', name: 'Catch' } as any;
  render(<CameraScreen navigation={navigation} route={route} />);
  return { navigation };
}

describe('CameraScreen', () => {
  afterEach(() => {
    jest.mocked(useCameraPermission).mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn(),
    } as any);
    jest.mocked(useCameraDevice).mockReturnValue({ id: 'mock-back-camera', position: 'back' } as any);
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

    expect(screen.getByText('Catch Animal')).toBeTruthy();
    expect(screen.getByText(/Collected: \d+ \/ \d+/)).toBeTruthy();
  });

  it('navigates to AnimalDetail with the captured photo path on shutter press', async () => {
    const { navigation } = renderScreen();

    fireEvent.press(screen.getByLabelText('Capture photo'));

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('AnimalDetail', {
        imageUri: 'file:///tmp/mock-photo.jpg',
      });
    });
  });
});
