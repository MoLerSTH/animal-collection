import { useAuthStore } from '../useAuthStore';
import { useCollectionStore } from '../../../collections/stores/useCollectionStore';
import { writeCollectionCache } from '../../../collections/stores/collectionCache';
import { appStorage, StorageKeys } from '../../../../core/storage/mmkv';
import { executeGoogleSignOut } from '../../services/googleAuth';
import { UserCollectionItem } from '../../../collections/types';

jest.mock('../../services/googleAuth', () => ({
  executeGoogleSignOut: jest.fn(), executeGoogleSignIn: jest.fn(), executeMockGoogleSignIn: jest.fn(),
  getSilentGoogleIdToken: jest.fn(), isGoogleClientConfigured: () => true,
}));
const originalFetch = globalThis.fetch;
const user = {id:'delete-a',name:'A',email:'a@example.com'};
const tokens = {accessToken:'old-jwt',idToken:'google-id'};
const photo = (userId: string): UserCollectionItem => ({id:`card-${userId}`,userId,animalSpecies:'Cat',category:'Domestic',name:'Cat',photoUrl:'file:///photo.jpg',story:'',favFood:'',temperament:'',isFavorite:false});
const response = (status: number, data?: unknown) => ({ok:status < 400,status,json:async()=>data});
beforeEach(() => {
  jest.clearAllMocks();
  appStorage.clearAll();
  useCollectionStore.setState({ownerId:null,collections:[]});
  useAuthStore.setState({user,tokens,isAuthenticated:true,isLoading:false,isInitializing:false});
  appStorage.set(StorageKeys.AUTH_USER, JSON.stringify(user));
  appStorage.set(StorageKeys.AUTH_TOKENS, JSON.stringify(tokens));
  writeCollectionCache(user.id,{catalog:[],collections:[photo(user.id)]});
  writeCollectionCache('other',{catalog:[],collections:[photo('other')]});
  useCollectionStore.getState().hydrateForUser(user.id);
  jest.mocked(executeGoogleSignOut).mockResolvedValue(undefined);
});
afterEach(() => { globalThis.fetch = originalFetch; });

it('purges only the deleted account after backend success and prevents cache re-creation on sign-out', async () => {
  appStorage.set(`starter_gift_claimed:${user.id}`, 'true');
  appStorage.set('starter_gift_claimed:other', 'true');
  globalThis.fetch = jest.fn().mockResolvedValue(response(204));
  await useAuthStore.getState().deleteAccount();
  expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'),expect.objectContaining({method:'DELETE',body:JSON.stringify({confirmation:'DELETE'})}));
  expect(useAuthStore.getState()).toMatchObject({user:null,tokens:null,isAuthenticated:false});
  expect(appStorage.getString('collection_snapshot:delete-a')).toBeUndefined();
  expect(appStorage.getString('collection_snapshot:other')).toContain('card-other');
  expect(appStorage.getString(StorageKeys.AUTH_TOKENS)).toBeUndefined();
  expect(appStorage.getString(`starter_gift_claimed:${user.id}`)).toBeUndefined();
  expect(appStorage.getString('starter_gift_claimed:other')).toBe('true');
});

it('keeps the session and cached photos when the backend cannot delete the account', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue(response(503));
  await expect(useAuthStore.getState().deleteAccount()).rejects.toThrow();
  expect(useAuthStore.getState()).toMatchObject({user,tokens,isAuthenticated:true,isLoading:false});
  expect(appStorage.getString('collection_snapshot:delete-a')).toContain('card-delete-a');
  expect(executeGoogleSignOut).not.toHaveBeenCalled();
});

it('renews an expired session before retrying the confirmed deletion', async () => {
  globalThis.fetch = jest.fn().mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(response(200,{user,accessToken:'fresh-jwt'})).mockResolvedValueOnce(response(204));
  await useAuthStore.getState().deleteAccount();
  expect(globalThis.fetch).toHaveBeenNthCalledWith(3,expect.stringContaining('/auth/me'),expect.objectContaining({method:'DELETE',headers:expect.objectContaining({Authorization:'Bearer fresh-jwt'})}));
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('blocks background renewal while deletion is pending', async () => {
  let finish!: (value: unknown) => void;
  globalThis.fetch = jest.fn().mockReturnValue(new Promise(resolve => {finish = resolve;}));
  const pending = useAuthStore.getState().deleteAccount();
  await expect(useAuthStore.getState().refreshSession()).resolves.toBeNull();
  finish(response(204));
  await pending;
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
});
