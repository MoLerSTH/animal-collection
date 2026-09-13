import '@testing-library/jest-native/extend-expect';

// react-native-safe-area-context needs a mock provider/insets in test env
jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    useSafeAreaInsets: () => inset,
    initialWindowMetrics: { insets: inset, frame: { x: 0, y: 0, width: 0, height: 0 } },
  };
});

// react-native-vision-camera pulls in native modules that don't exist under Jest
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const MockCamera = React.forwardRef((_props: unknown, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      takePhoto: jest.fn().mockResolvedValue({ path: '/tmp/mock-photo.jpg' }),
    }));
    return null;
  });
  return {
    Camera: MockCamera,
    useCameraDevice: jest.fn(() => ({ id: 'mock-back-camera', position: 'back' })),
    useCameraPermission: jest.fn(() => ({
      hasPermission: true,
      requestPermission: jest.fn(),
    })),
  };
});

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));
