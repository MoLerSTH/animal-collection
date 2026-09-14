export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUri?: string;
  googleId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
}

export interface AuthState {
  user: AuthUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  isDevMode: boolean;
  // Actions
  initializeAuth: () => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  signInMock: (customUser?: Partial<AuthUser>) => Promise<void>;
  signOut: () => Promise<void>;
}

