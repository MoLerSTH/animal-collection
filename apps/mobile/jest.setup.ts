import '@testing-library/jest-native/extend-expect';

// Match Expo's native runtime; Jest's default FormData stub hides upload failures.
const { installFormDataPatch } = jest.requireActual('expo/src/winter/FormData');
globalThis.FormData = installFormDataPatch(
  jest.requireActual('react-native/Libraries/Network/FormData').default,
);

jest.mock('expo-crypto', () => ({randomUUID: () => require('crypto').randomUUID()}));
jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();
  return {getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value)};
});
jest.mock('expo-file-system', () => ({
  Paths: {document: 'file:///documents'},
  Directory: jest.fn().mockImplementation((...parts: any[]) => ({uri: parts.map(part => part.uri || part).join('/'), create: jest.fn()})),
  File: jest.fn().mockImplementation((...parts: any[]) => {
    const uri = parts.map(part => part.uri || part).join('/');
    return {uri, name: uri.split('/').pop() || 'capture.jpg', type: 'image/jpeg', exists: true, size: 4,
      copy: jest.fn(), bytes: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), delete: jest.fn()};
  }),
}));

// react-native-safe-area-context needs a mock provider/insets in test env
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const SafeAreaInsetsContext = React.createContext(inset);
  const SafeAreaFrameContext = React.createContext(frame);
  return {
    SafeAreaProvider: ({ children }: { children: any }) => children,
    SafeAreaView: ({ children }: { children: any }) => children,
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
    SafeAreaInsetsContext,
    SafeAreaFrameContext,
    SafeAreaConsumer: SafeAreaInsetsContext.Consumer,
    initialWindowMetrics: { insets: inset, frame },
  };
});

// react-native-vision-camera pulls in native modules that don't exist under Jest
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const mockTakePhoto = jest.fn().mockResolvedValue({ path: '/tmp/mock-photo.jpg' });
  const MockCamera = React.forwardRef((_props: unknown, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      takePhoto: mockTakePhoto,
    }));
    return null;
  });
  return {
    Camera: MockCamera,
    mockTakePhoto,
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

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('expo-location',()=>({
 requestForegroundPermissionsAsync:jest.fn(async()=>({granted:false})),
 getLastKnownPositionAsync:jest.fn(async()=>null),
 getCurrentPositionAsync:jest.fn(), Accuracy:{Balanced:3},
}));
jest.mock('expo-sharing',()=>({isAvailableAsync:jest.fn(async()=>false),shareAsync:jest.fn(async()=>{})}));
jest.mock('react-native-view-shot',()=>({captureRef:jest.fn(async()=>'/tmp/polaroid.png'),releaseCapture:jest.fn()}));
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///mock-camera.jpg' }] }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///mock-gallery.jpg' }] }),
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted', granted: true }),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos', All: 'All' },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
}));

jest.mock('expo-font', () => ({
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn().mockResolvedValue(true),
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('@expo-google-fonts/kanit', () => ({
  useFonts: jest.fn(() => [true, null]),
  Kanit_400Regular: 1,
  Kanit_500Medium: 2,
  Kanit_600SemiBold: 3,
  Kanit_700Bold: 4,
  Kanit_800ExtraBold: 5,
}));
