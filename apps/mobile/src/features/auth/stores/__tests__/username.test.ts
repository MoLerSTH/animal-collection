import { useAuthStore } from '../useAuthStore';
import { appStorage, StorageKeys } from '../../../../core/storage/mmkv';

jest.mock('../../services/googleAuth', () => ({
  executeGoogleSignOut: jest.fn().mockResolvedValue(undefined),
  executeGoogleSignIn: jest.fn(), executeMockGoogleSignIn: jest.fn(),
  getSilentGoogleIdToken: jest.fn(), isGoogleClientConfigured: () => true,
}));
const originalFetch = globalThis.fetch;
const user = {id:'name-a',name:'Google Name',email:'a@example.com'};
const tokens = {accessToken:'old-jwt',idToken:'google-id'};
const updated = {...user,name:'นักสำรวจ'};
const response = (status: number, data?: unknown) => ({ok:status < 400,status,json:async()=>data});
const deferred = () => {
  let resolve!: (value: unknown) => void;
  const promise = new Promise(r => {resolve = r;});
  return {promise, resolve};
};
beforeEach(() => {
  jest.clearAllMocks();
  appStorage.clearAll();
  useAuthStore.setState({user,tokens,isAuthenticated:true,isLoading:false,isInitializing:false});
  appStorage.set(StorageKeys.AUTH_USER,JSON.stringify(user));
  appStorage.set(StorageKeys.AUTH_TOKENS,JSON.stringify(tokens));
});
afterEach(() => {globalThis.fetch = originalFetch;});

it('saves only a confirmed name to the current account and local session', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue(response(200,updated));
  await useAuthStore.getState().updateUsername('  นักสำรวจ  ');
  expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('/auth/me'),expect.objectContaining({
    method:'PATCH',body:JSON.stringify({name:updated.name}),headers:expect.objectContaining({Authorization:'Bearer old-jwt'}),
  }));
  expect(useAuthStore.getState()).toMatchObject({user:updated,tokens,isLoading:false,isAuthenticated:true});
  expect(JSON.parse(appStorage.getString(StorageKeys.AUTH_USER)!)).toMatchObject(updated);
  expect(JSON.parse(appStorage.getString(StorageKeys.AUTH_TOKENS)!)).toEqual(tokens);
});

it('rejects invalid names and does not send unchanged names', async () => {
  globalThis.fetch = jest.fn();
  for (const name of [' ', 'a', 'x'.repeat(31), 'two\nlines']) {
    await expect(useAuthStore.getState().updateUsername(name)).rejects.toThrow();
  }
  await useAuthStore.getState().updateUsername(user.name);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it('retains the previous name and credentials if saving fails', async () => {
  globalThis.fetch = jest.fn().mockResolvedValue(response(503));
  await expect(useAuthStore.getState().updateUsername(updated.name)).rejects.toThrow();
  expect(useAuthStore.getState()).toMatchObject({user,tokens,isLoading:false});
  expect(JSON.parse(appStorage.getString(StorageKeys.AUTH_USER)!)).toEqual(user);
});

it('renews an expired token once before retrying the name change', async () => {
  globalThis.fetch = jest.fn().mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(response(200,{user,accessToken:'fresh-jwt'}))
    .mockResolvedValueOnce(response(200,updated));
  await useAuthStore.getState().updateUsername(updated.name);
  expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  expect(globalThis.fetch).toHaveBeenNthCalledWith(3,expect.stringContaining('/auth/me'),expect.objectContaining({
    method:'PATCH',headers:expect.objectContaining({Authorization:'Bearer fresh-jwt'}),
  }));
  expect(useAuthStore.getState()).toMatchObject({user:updated,tokens:{accessToken:'fresh-jwt'},isLoading:false});
});

it('ignores a delayed response after signing out', async () => {
  const request = deferred();
  globalThis.fetch = jest.fn().mockReturnValue(request.promise);
  const pending = useAuthStore.getState().updateUsername(updated.name);
  const check = expect(pending).rejects.toThrow('account changed');
  await useAuthStore.getState().signOut();
  request.resolve(response(200,updated));
  await check;
  expect(useAuthStore.getState()).toMatchObject({user:null,tokens:null,isAuthenticated:false,isLoading:false});
  expect(appStorage.getString(StorageKeys.AUTH_USER)).toBeUndefined();
});

it('does not overwrite a saved name with a refresh response that started earlier', async () => {
  const refreshRequest = deferred();
  globalThis.fetch = jest.fn().mockReturnValueOnce(refreshRequest.promise).mockResolvedValueOnce(response(200,updated));
  const refreshing = useAuthStore.getState().refreshSession();
  await useAuthStore.getState().updateUsername(updated.name);
  refreshRequest.resolve(response(200,{user,accessToken:'fresh-jwt'}));
  await refreshing;
  expect(useAuthStore.getState()).toMatchObject({user:updated,tokens:{accessToken:'fresh-jwt'}});
  expect(JSON.parse(appStorage.getString(StorageKeys.AUTH_USER)!)).toMatchObject(updated);
});

it('does not overwrite a saved name with a profile restoration response that started earlier', async () => {
  const profileRequest = deferred();
  globalThis.fetch = jest.fn().mockReturnValueOnce(profileRequest.promise).mockResolvedValueOnce(response(200,updated));
  const initializing = useAuthStore.getState().initializeAuth();
  await useAuthStore.getState().updateUsername(updated.name);
  profileRequest.resolve(response(200,user));
  await initializing;
  expect(useAuthStore.getState()).toMatchObject({user:updated,isInitializing:false});
  expect(JSON.parse(appStorage.getString(StorageKeys.AUTH_USER)!)).toMatchObject(updated);
});
