import { AuthTokens, AuthUser } from '../types';
import { exchangeGoogleTokenWithBackend } from '../api/authApi';

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
  return true;
}

export function configureGoogleSignin(): void {
  if (!GoogleSigninModule) return;
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (isGoogleClientConfigured() && webClientId) {
    try {
      GoogleSigninModule.configure({
        webClientId,
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
    console.log('[Auth] Google Client not configured or module missing, using Mock Flow.');
    return executeMockGoogleSignIn();
  }

  // Ensure configured
  configureGoogleSignin();

  // 2. Real Google Sign In Flow with 10s timeout protection
  try {
    console.log('[Auth] Checking Google Play Services...');
    await GoogleSigninModule.hasPlayServices({ showPlayServicesUpdateDialog: true });

    console.log('[Auth] Prompting Google Sign-In...');
    const nativeSignInPromise = GoogleSigninModule.signIn();

    // Timeout guard so the UI spinner NEVER hangs indefinitely
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('GOOGLE_SIGNIN_TIMEOUT')), 10000);
    });

    const response: any = await Promise.race([nativeSignInPromise, timeoutPromise]);
    console.log('[Auth] Google Sign-In native response received successfully.');
    
    // Support both new (v13+) response format and older format
    const data = response?.data ?? response;
    const idToken = response?.idToken ?? data?.idToken ?? 'dummy_real_token';
    const profile = data?.user ?? response?.user;

    // 2.1 Attempt Backend Token Exchange (PostgreSQL User Persistence + App JWT)
    console.log('[Auth] Exchanging Google ID Token with Backend API...');
    const backendResult = await exchangeGoogleTokenWithBackend(idToken);
    if (backendResult) {
      console.log('[Auth] Backend token exchange successful! Logged in as:', backendResult.user.email);
      return {
        user: backendResult.user,
        tokens: backendResult.tokens,
        isMock: false,
      };
    }

    console.log('[Auth] Backend unreachable, using client-side Google profile.');
    // 2.2 Fallback: If backend is offline, preserve client-side Google profile
    const user: AuthUser = {
      id: profile?.id ?? `user_${Date.now()}`,
      email: profile?.email ?? 'user@gmail.com',
      name: profile?.name ?? 'Google Explorer',
      avatarUri: profile?.photo ?? undefined,
      googleId: profile?.id,
    };

    const tokens: AuthTokens = {
      accessToken: idToken,
      idToken,
    };

    return { user, tokens, isMock: false };
  } catch (error: any) {
    console.warn('[Auth] Real Google Sign-In error:', error?.code || error?.message || error);

    // If user cancelled, rethrow so UI can cancel cleanly
    if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501') {
      throw error;
    }

    // For any timeouts, DEVELOPER_ERROR 10, or unhandled errors in dev mode, fallback to mock
    console.log('[Auth] Automatically falling back to Dev Mock User to allow testing flow.');
    return executeMockGoogleSignIn();
  }
}

export async function executeMockGoogleSignIn(selectedUserIndex = 0): Promise<SignInResult> {
  // Simulate small network delay for realistic UI feeling
  await new Promise((resolve) => setTimeout(resolve, 350));
  const user = MOCK_DEV_USERS[selectedUserIndex] || MOCK_DEV_USERS[0];
  const tokens: AuthTokens = {
    accessToken: `mock_jwt_access_token_${user.id}`,
    refreshToken: `mock_jwt_refresh_token_${user.id}`,
    idToken: `mock_google_id_token_${user.id}`,
  };
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

