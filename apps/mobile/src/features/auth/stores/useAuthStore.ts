import { create } from 'zustand';
import { AuthState, AuthUser, AuthTokens } from '../types';
import { appStorage, StorageKeys } from '../../../core/storage/mmkv';
import {
  configureGoogleSignin,
  executeGoogleSignIn,
  executeMockGoogleSignIn,
  executeGoogleSignOut,
  isGoogleClientConfigured,
} from '../services/googleAuth';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  isDevMode: !isGoogleClientConfigured(),

  initializeAuth: async () => {
    try {
      configureGoogleSignin();
      const storedUser = appStorage.getString(StorageKeys.AUTH_USER);
      const storedTokens = appStorage.getString(StorageKeys.AUTH_TOKENS);

      if (storedUser && storedTokens) {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        const parsedTokens: AuthTokens = JSON.parse(storedTokens);
        set({
          user: parsedUser,
          tokens: parsedTokens,
          isAuthenticated: true,
          isLoading: false,
          isInitializing: false,
          isDevMode: !isGoogleClientConfigured(),
        });
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
      isDevMode: !isGoogleClientConfigured(),
    });
  },

  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      const result = await executeGoogleSignIn();
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

  signInMock: async (customUser) => {
    set({ isLoading: true });
    try {
      const result = await executeMockGoogleSignIn();
      const finalUser = customUser ? { ...result.user, ...customUser } : result.user;
      
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
    set({ isLoading: true });
    try {
      await executeGoogleSignOut();
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
}));

