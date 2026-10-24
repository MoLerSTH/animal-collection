import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { configureGoogleSignin, executeGoogleSignIn, getSilentGoogleIdToken, isGoogleClientConfigured } from '../googleAuth';
import { requestBackendSession } from '../../api/authApi';

jest.mock('@react-native-google-signin/google-signin', () => ({ GoogleSignin: {
  configure: jest.fn(), signIn: jest.fn(), signInSilently: jest.fn(), getTokens: jest.fn(), hasPlayServices: jest.fn(), signOut: jest.fn(),
} }));
jest.mock('../../api/authApi', () => ({ exchangeGoogleTokenWithBackend: jest.fn(async () => null), requestBackendSession: jest.fn() }));

const originalPlatform = Platform.OS;
const originalWebId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const originalIosId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const setPlatform = (os: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { configurable: true, value: os });
beforeEach(() => {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web-test.apps.googleusercontent.com';
  delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  setPlatform('ios');
});
afterEach(() => {
  setPlatform(originalPlatform);
  if (originalWebId === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalWebId;
  if (originalIosId === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = originalIosId;
});
it('does not call native configure on iOS with only a web client ID', () => {
  expect(isGoogleClientConfigured()).toBe(false);
  configureGoogleSignin();
  expect(GoogleSignin.configure).not.toHaveBeenCalled();
});
it('allows development login without invoking unconfigured native iOS sign-in', async () => {
  const result = await executeGoogleSignIn();
  expect(result.isMock).toBe(true);
  expect(GoogleSignin.configure).not.toHaveBeenCalled();
  expect(GoogleSignin.signIn).not.toHaveBeenCalled();
});
it('passes both iOS and Web client IDs when iOS is configured', () => {
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-test.apps.googleusercontent.com';
  configureGoogleSignin();
  expect(GoogleSignin.configure).toHaveBeenCalledWith(expect.objectContaining({
    webClientId:'web-test.apps.googleusercontent.com', iosClientId:'ios-test.apps.googleusercontent.com',
  }));
});
it('keeps Android sign-in configured with just the web client', () => {
  setPlatform('android');
  expect(isGoogleClientConfigured()).toBe(true);
  configureGoogleSignin();
  expect(GoogleSignin.configure).toHaveBeenCalledWith(expect.not.objectContaining({iosClientId:expect.anything()}));
});
it('reports native configuration failure without switching a real login to a mock account', async () => {
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'ios-test.apps.googleusercontent.com';
  jest.mocked(GoogleSignin.signIn).mockRejectedValueOnce(new Error('native configuration failed'));
  await expect(executeGoogleSignIn()).rejects.toThrow('native configuration failed');
  expect(GoogleSignin.hasPlayServices).not.toHaveBeenCalled();
});

it('does not accept a Google ID token as a backend JWT when exchange fails', async () => {
  setPlatform('android');
  jest.mocked(GoogleSignin.signIn).mockResolvedValueOnce({ type: 'success', data: { idToken: 'google-id', user: { id: 'g-a' } } } as any);
  jest.mocked(requestBackendSession).mockRejectedValueOnce(new Error('Backend unavailable'));
  await expect(executeGoogleSignIn()).rejects.toThrow('Backend unavailable');
});

it('silently obtains fresh credentials for the same saved Google account', async () => {
  setPlatform('android');
  jest.mocked(GoogleSignin.signInSilently).mockResolvedValueOnce({ type: 'success', data: { user: { id: 'g-a', email: 'a@example.com' } } } as any);
  jest.mocked(GoogleSignin.getTokens).mockResolvedValueOnce({ idToken: 'fresh-google-id', accessToken: 'google-api-access' });
  await expect(getSilentGoogleIdToken({ id: 'a', googleId: 'g-a', email: 'a@example.com', name: 'A' })).resolves.toBe('fresh-google-id');
  expect(GoogleSignin.signIn).not.toHaveBeenCalled();
});

it('never silently changes to another Google account', async () => {
  setPlatform('android');
  jest.mocked(GoogleSignin.signInSilently).mockResolvedValueOnce({ type: 'success', data: { user: { id: 'g-b', email: 'b@example.com' } } } as any);
  await expect(getSilentGoogleIdToken({ id: 'a', googleId: 'g-a', email: 'a@example.com', name: 'A' })).resolves.toBeNull();
  expect(GoogleSignin.getTokens).not.toHaveBeenCalled();
});
