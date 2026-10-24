import { create } from 'zustand';
import { AuthState, AuthUser, AuthTokens } from '../types';
import { AuthApiError, BackendSession, deleteBackendAccount, fetchBackendUser, requestBackendSession, updateBackendUsername } from '../api/authApi';
import { removeLocalAccountData } from '../../../core/storage/accountData';
import { appStorage, StorageKeys } from '../../../core/storage/mmkv';
import {
  executeGoogleSignIn,
  executeMockGoogleSignIn,
  executeGoogleSignOut,
  isGoogleClientConfigured,
  getSilentGoogleIdToken,
} from '../services/googleAuth';

let sessionVersion = 0;
let profileVersion = 0;
let deletingUserId: string | null = null;
let pendingRefresh: { userId: string; version: number; promise: Promise<string | null> } | null = null;
const rejectedSession = (error: unknown) => error instanceof AuthApiError && [401, 403, 404].includes(error.status);
function persistSession(session: BackendSession) {
  appStorage.set(StorageKeys.AUTH_USER, JSON.stringify(session.user));
  appStorage.set(StorageKeys.AUTH_TOKENS, JSON.stringify(session.tokens));
}

async function renewBackendSession(user: AuthUser, tokens: AuthTokens): Promise<BackendSession | undefined> {
  if (tokens.idToken) {
    try { return await requestBackendSession(tokens.idToken); }
    catch (error) { if (!rejectedSession(error)) throw error; }
  }
  const idToken = await getSilentGoogleIdToken(user);
  if (idToken) {
    try { return await requestBackendSession(idToken); }
    catch (error) { if (!rejectedSession(error)) throw error; }
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  isDevMode: __DEV__ && process.env.EXPO_PUBLIC_APP_ENV !== 'production' && !isGoogleClientConfigured(),

  initializeAuth: async () => {
    const version = sessionVersion;
    const requestedProfileVersion = profileVersion;
    try {
      const storedUser = appStorage.getString(StorageKeys.AUTH_USER);
      const storedTokens = appStorage.getString(StorageKeys.AUTH_TOKENS);

      if (storedUser && storedTokens) {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        const parsedTokens: AuthTokens = JSON.parse(storedTokens);
        if (!parsedUser.id || !parsedTokens.accessToken) throw new Error('Invalid stored session');
        set({
          user: parsedUser,
          tokens: parsedTokens,
          isAuthenticated: true,
          isLoading: false,
          isDevMode: __DEV__ && process.env.EXPO_PUBLIC_APP_ENV !== 'production' && !isGoogleClientConfigured(),
        });
        try {
          let user = await fetchBackendUser(parsedTokens.accessToken);
          if (version !== sessionVersion) return;
          if (requestedProfileVersion !== profileVersion && get().user?.id === user.id) user = {...user, name: get().user!.name};
          persistSession({ user, tokens: get().tokens || parsedTokens });
          set({ user });
        } catch (error) {
          if (rejectedSession(error)) {
            if (version !== sessionVersion) return;
            // A cached profile is not proof that its backend session is valid.
            try { await get().refreshSession(); }
            catch { /* A temporary outage must not remove the saved session. */ }
          }
          // Network/server outages retain the previous account and offline album.
        } finally {
          set({ isInitializing: false });
        }
        return;
      }
    } catch (e) {
      console.warn('Failed to restore auth session from storage', e);
    }

    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
      isDevMode: __DEV__ && process.env.EXPO_PUBLIC_APP_ENV !== 'production' && !isGoogleClientConfigured(),
    });
  },

  refreshSession: () => {
    const { user, tokens } = get();
    if (!user || !tokens) return Promise.resolve(null);
    if (deletingUserId === user.id) return Promise.resolve(null);
    if (pendingRefresh?.userId === user.id && pendingRefresh.version === sessionVersion) return pendingRefresh.promise;
    const version = sessionVersion;
    const requestedProfileVersion = profileVersion;
    const stillCurrent = () => version === sessionVersion && get().user?.id === user.id;
    const promise = (async () => {
      const session = await renewBackendSession(user, tokens);
      if (!stillCurrent()) return null;
      if (session && session.user.email.toLowerCase() === user.email.toLowerCase()) {
        if (requestedProfileVersion !== profileVersion && get().user?.id === session.user.id) session.user = {...session.user, name: get().user!.name};
        persistSession(session);
        set({ user: session.user, tokens: session.tokens, isAuthenticated: true });
        return session.tokens.accessToken;
      }
      // Keep album caches; only an unavailable/revoked credential requires login.
      appStorage.delete(StorageKeys.AUTH_TOKENS);
      appStorage.delete(StorageKeys.AUTH_USER);
      set({ user: null, tokens: null, isAuthenticated: false });
      return null;
    })().finally(() => {
      if (pendingRefresh?.promise === promise) pendingRefresh = null;
    });
    pendingRefresh = { userId: user.id, version, promise };
    return promise;
  },

  signInWithGoogle: async () => {
    const version = ++sessionVersion;
    set({ isLoading: true });
    try {
      const result = await executeGoogleSignIn();
      if (version !== sessionVersion) return false;
      appStorage.set(StorageKeys.AUTH_USER, JSON.stringify(result.user));
      appStorage.set(StorageKeys.AUTH_TOKENS, JSON.stringify(result.tokens));

      set({
        user: result.user,
        tokens: result.tokens,
        isAuthenticated: true,
        isLoading: false,
        isDevMode: result.isMock,
      });
      return true;
    } finally {
      set({ isLoading: false });
    }
  },

  updateUsername: async (value) => {
    const name = value.trim();
    if (name.length < 2 || name.length > 30 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('Use 2–30 characters without line breaks.');
    const {user, tokens, isLoading} = get();
    if (!user || !tokens) throw new Error('Please sign in before changing your username.');
    if (isLoading || deletingUserId === user.id) throw new Error('Please wait for the current account action.');
    if (name === user.name) return;
    const version = sessionVersion;
    const stillCurrent = () => version === sessionVersion && get().user?.id === user.id;
    set({isLoading: true});
    try {
      let updated: AuthUser;
      try { updated = await updateBackendUsername(name, tokens.accessToken); }
      catch (error) {
        if (!(error instanceof AuthApiError) || error.status !== 401 || !stillCurrent()) throw error;
        const freshToken = await get().refreshSession();
        if (!freshToken || !stillCurrent()) throw new Error('Please sign in again.');
        updated = await updateBackendUsername(name, freshToken);
      }
      if (!stillCurrent()) throw new Error('The account changed. Please try again.');
      if (updated.id !== user.id) throw new Error('The account service returned a different profile.');
      profileVersion += 1;
      appStorage.set(StorageKeys.AUTH_USER, JSON.stringify(updated));
      set({user: updated});
    } finally {
      if (stillCurrent()) set({isLoading: false});
    }
  },

  signInMock: async (customUser) => {
    const version = ++sessionVersion;
    set({ isLoading: true });
    try {
      const result = await executeMockGoogleSignIn();
      if (version !== sessionVersion) return;
      const finalUser = customUser && result.tokens.accessToken.startsWith('mock_jwt_')
        ? { ...result.user, ...customUser } : result.user;
      
      appStorage.set(StorageKeys.AUTH_USER, JSON.stringify(finalUser));
      appStorage.set(StorageKeys.AUTH_TOKENS, JSON.stringify(result.tokens));

      set({
        user: finalUser,
        tokens: result.tokens,
        isAuthenticated: true,
        isLoading: false,
        isDevMode: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    const version = ++sessionVersion;
    set({ isLoading: true });
    try {
      await executeGoogleSignOut();
      if (version !== sessionVersion) return;
      appStorage.delete(StorageKeys.AUTH_USER);
      appStorage.delete(StorageKeys.AUTH_TOKENS);

      set({
        user: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  deleteAccount: async () => {
    const { user, tokens, isLoading } = get();
    if (!user || !tokens || isLoading) throw new Error('Please sign in before deleting your account.');
    const version = ++sessionVersion;
    deletingUserId = user.id;
    set({ isLoading: true });
    try {
      // Finish/cancel any old renewal before deletion so it cannot recreate this account afterward.
      if (pendingRefresh?.userId === user.id) await pendingRefresh.promise.catch(() => null);
      try { await deleteBackendAccount(tokens.accessToken); }
      catch (error) {
        if (!(error instanceof AuthApiError) || error.status !== 401) throw error;
        const fresh = await renewBackendSession(user, tokens);
        if (!fresh || fresh.user.id !== user.id) throw new Error('Please sign in again.');
        await deleteBackendAccount(fresh.tokens.accessToken);
      }
      removeLocalAccountData(user.id);
      if (version !== sessionVersion || get().user?.id !== user.id) return;
      appStorage.delete(StorageKeys.AUTH_USER);
      appStorage.delete(StorageKeys.AUTH_TOKENS);
      await executeGoogleSignOut();
      set({ user: null, tokens: null, isAuthenticated: false });
    } finally {
      deletingUserId = null;
      set({ isLoading: false });
    }
  },
}));

