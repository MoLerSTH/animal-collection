import { Platform } from 'react-native';
import { AuthTokens, AuthUser } from '../types';
import { exchangeGoogleTokenWithBackend, requestBackendSession } from '../api/authApi';

let GoogleSigninModule: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const gSignin = require('@react-native-google-signin/google-signin');
  GoogleSigninModule = gSignin.GoogleSignin;
} catch {
  // Graceful fallback for non-native test environments
}

export const MOCK_DEV_USERS: AuthUser[] = [
  {
    id: 'user_dev_01',
    email: 'jane.doe@animalcollection.dev',
    name: 'Jane Doe (Ranger)',
    avatarUri: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=200&auto=format&fit=crop',
    googleId: 'google_mock_123456789',
  },
  {
    id: 'user_dev_02',
    email: 'alex.smith@animalcollection.dev',
    name: 'Alex Smith (Collector)',
    avatarUri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
    googleId: 'google_mock_987654321',
  },
];

export function isGoogleClientConfigured(): boolean {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) return false;
  // If still using placeholder from .env.example
  if (webClientId.includes('your_google_web_client_id')) return false;
  if (Platform.OS === 'ios') {
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (!iosClientId || iosClientId.includes('your_google_ios_client_id')) return false;
  }
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function configureGoogleSignin(): void {
  if (!GoogleSigninModule || !isGoogleClientConfigured()) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (isGoogleClientConfigured() && webClientId) {
    try {
      GoogleSigninModule.configure({
        webClientId,
        ...(Platform.OS === 'ios' ? { iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID } : {}),
        scopes: ['profile', 'email'],
      });
      console.log('[Auth] GoogleSignin configured successfully with Client ID:', webClientId.substring(0, 15) + '...');
    } catch (err) {
      console.warn('[Auth] Failed to configure GoogleSignin', err);
    }
  }
}

export interface SignInResult {
  user: AuthUser;
  tokens: AuthTokens;
  isMock: boolean;
}

export async function executeGoogleSignIn(): Promise<SignInResult> {
  // 1. If Google credentials are not configured or module unavailable, use Mock Flow
  if (!isGoogleClientConfigured() || !GoogleSigninModule) {
    if (!__DEV__ || process.env.EXPO_PUBLIC_APP_ENV === 'production') throw new Error('Google sign-in is not configured for this build.');
    console.log('[Auth] Google Client not configured or module missing, using Mock Flow.');
    return executeMockGoogleSignIn();
  }

  // 2. Real Google Sign In Flow with 10s timeout protection
  try {
    console.log('[Auth] Checking Google Play Services...');
    if (Platform.OS === 'android') {
      await GoogleSigninModule.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    console.log('[Auth] Prompting Google Sign-In...');
    // signIn awaits the library's internal configure promise. Attach its handler
    // immediately so an async native configuration failure cannot go unhandled.
    configureGoogleSignin();
    const nativeSignInPromise = GoogleSigninModule.signIn();

    // Timeout guard so the UI spinner NEVER hangs indefinitely
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('GOOGLE_SIGNIN_TIMEOUT')), 10000);
    });

    const response: any = await Promise.race([nativeSignInPromise, timeoutPromise]).finally(() => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    });
    console.log('[Auth] Google Sign-In native response received successfully.');
    
    // Support both new (v13+) response format and older format
    if (response?.type === 'cancelled') {
      throw Object.assign(new Error('Sign-in cancelled'), { code: 'SIGN_IN_CANCELLED' });
    }
    const data = response?.data ?? response;
    const idToken = response?.idToken ?? data?.idToken;
    if (!idToken) throw new Error('Google Sign-In did not return an ID token');

    // 2.1 Attempt Backend Token Exchange (PostgreSQL User Persistence + App JWT)
    console.log('[Auth] Exchanging Google ID Token with Backend API...');
    const backendResult = await requestBackendSession(idToken);
    console.log('[Auth] Backend token exchange successful!');
    return { ...backendResult, isMock: false };
  } catch (error: any) {
    console.warn('[Auth] Real Google Sign-In error:', error?.code || error?.message || error);

    // If user cancelled, rethrow so UI can cancel cleanly
    if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501') {
      throw error;
    }

    // A failed real login must never silently change the account to a mock user
    // or use a Google ID token as an application session JWT.
    throw error;
  }
}

/** Restore the same Google account without opening the account picker. */
export async function getSilentGoogleIdToken(expected: AuthUser): Promise<string | null> {
  if (!GoogleSigninModule || !isGoogleClientConfigured()) return null;
  configureGoogleSignin();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      (async () => {
        const response = await GoogleSigninModule.signInSilently();
        if (response?.type === 'noSavedCredentialFound') return null;
        const data = response?.data ?? response;
        const user = data?.user;
        if (!user || (expected.googleId ? user.id !== expected.googleId : user.email?.toLowerCase() !== expected.email.toLowerCase())) return null;
        const tokens = await GoogleSigninModule.getTokens();
        return tokens?.idToken || data?.idToken || null;
      })(),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Session restoration timed out. Please try again.')), 8000); }),
    ]);
  } catch (error: any) {
    if (error?.code === 'SIGN_IN_REQUIRED' || error?.code === '4') return null;
    throw error;
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

export async function executeMockGoogleSignIn(selectedUserIndex = 0): Promise<SignInResult> {
  if (!__DEV__ || process.env.EXPO_PUBLIC_APP_ENV === 'production') throw new Error('Mock sign-in is only available in development builds.');
  // Simulate small network delay for realistic UI feeling
  await new Promise((resolve) => setTimeout(resolve, 350));
  const user = MOCK_DEV_USERS[selectedUserIndex] || MOCK_DEV_USERS[0];
  const tokens: AuthTokens = {
    accessToken: `mock_jwt_access_token_${user.id}`,
    refreshToken: `mock_jwt_refresh_token_${user.id}`,
    idToken: `mock_google_id_token_${user.id}`,
  };
  // The protected discovery API requires a backend-signed session JWT.
  // Keep the offline mock profile only when the development backend is unavailable.
  const backendResult = await exchangeGoogleTokenWithBackend(tokens.idToken!);
  if (backendResult) return { ...backendResult, isMock: true };
  return { user, tokens, isMock: true };
}

export async function executeGoogleSignOut(): Promise<void> {
  if (GoogleSigninModule && isGoogleClientConfigured()) {
    try {
      await GoogleSigninModule.signOut();
    } catch {
      // Ignore signOut errors if not signed in via native module
    }
  }
}

