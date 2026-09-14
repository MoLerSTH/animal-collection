import { useAuthStore } from '../useAuthStore';
import { appStorage, StorageKeys } from '../../../../core/storage/mmkv';

describe('useAuthStore', () => {
  beforeEach(async () => {
    appStorage.clearAll();
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      isDevMode: true,
    });
  });

  it('starts with unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('signs in with mock user in dev mode', async () => {
    await useAuthStore.getState().signInMock();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).not.toBeNull();
    expect(state.user?.email).toContain('@animalcollection.dev');
    expect(state.isDevMode).toBe(true);

    // Verify persisted into storage
    const storedUser = appStorage.getString(StorageKeys.AUTH_USER);
    expect(storedUser).toBeTruthy();
    expect(JSON.parse(storedUser!).id).toBe(state.user?.id);
  });

  it('restores existing session on initializeAuth', async () => {
    const testUser = {
      id: 'restored_01',
      email: 'restored@test.com',
      name: 'Restored User',
    };
    const testTokens = {
      accessToken: 'token_123',
    };

    appStorage.set(StorageKeys.AUTH_USER, JSON.stringify(testUser));
    appStorage.set(StorageKeys.AUTH_TOKENS, JSON.stringify(testTokens));

    await useAuthStore.getState().initializeAuth();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.id).toBe('restored_01');
    expect(state.user?.name).toBe('Restored User');
  });

  it('clears state and storage on signOut', async () => {
    await useAuthStore.getState().signInMock();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    await useAuthStore.getState().signOut();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.tokens).toBeNull();
    expect(appStorage.getString(StorageKeys.AUTH_USER)).toBeUndefined();
  });
});

