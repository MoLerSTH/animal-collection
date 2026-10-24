import { useCollectionStore } from '../useCollectionStore';
import { useAuthStore } from '../../../auth/stores/useAuthStore';
import { appStorage } from '../../../../core/storage/mmkv';
import { createCollectionApi, uploadPhotoApi, updateCollectionApi } from '../../api/collectionApi';
import { CreateCollectionPayload, UserCollectionItem } from '../../types';
import { readCollectionCache } from '../collectionCache';

jest.mock('../../api/collectionApi', () => ({
  ...jest.requireActual('../../api/collectionApi'),
  uploadPhotoApi: jest.fn(), createCollectionApi: jest.fn(), updateCollectionApi: jest.fn(),
}));
const user = {id: 'account-a', email: 'a@example.com', name: 'A'};
const remote = (payload: CreateCollectionPayload): UserCollectionItem => ({
  ...payload, id: payload.clientRequestId!, userId: user.id, animalSpecies: payload.identifiedSpecies || payload.name,
  category: 'Wild', story: payload.story || '', favFood: '', temperament: '', isFavorite: Boolean(payload.isFavorite), source: 'capture',
});
beforeEach(() => {
  jest.clearAllMocks(); appStorage.clearAll();
  useAuthStore.setState({user, tokens: {accessToken: 'session'}, isAuthenticated: true});
  useCollectionStore.setState({ownerId: user.id, catalog: [], collections: [], isSubmitting: false, isSyncing: false});
  jest.mocked(uploadPhotoApi).mockResolvedValue('/api/v1/storage/photos/user_a_photo.jpg');
  jest.mocked(createCollectionApi).mockImplementation(async payload => remote(payload));
});
const add = () => useCollectionStore.getState().addCollection({photoUri: 'file:///camera/temp.jpg', name: 'Pet', identifiedSpecies: 'Cat', animalType: 'Mammal'});

it('retains and persists the photo before attempting a network upload', async () => {
  jest.mocked(uploadPhotoApi).mockImplementation(async uri => {
    expect(uri).toMatch(/^file:\/\/\/documents\/captures\//);
    const saved = readCollectionCache(user.id, []).collections[0];
    expect(saved).toMatchObject({syncStatus: 'pending', localPhotoUri: uri});
    return '/api/v1/storage/photos/user_a_photo.jpg';
  });
  const card = await add();
  expect(card).toMatchObject({syncStatus: 'synced', identifiedSpecies: 'Cat'});
  expect(useCollectionStore.getState().collections).toHaveLength(1);
});
it('does not send a device-local URI to the collection API when upload fails', async () => {
  jest.mocked(uploadPhotoApi).mockResolvedValue(null);
  const card = await add();
  expect(card.syncStatus).toBe('pending');
  expect(card.syncError).toContain('Waiting to sync');
  expect(createCollectionApi).not.toHaveBeenCalled();
  expect(readCollectionCache(user.id, []).collections[0].clientRequestId).toBe(card.clientRequestId);
});
it('recovers a pending capture after restarting the store', async () => {
  jest.mocked(uploadPhotoApi).mockResolvedValueOnce(null);
  const original = await add();
  useCollectionStore.setState({collections: []});
  useCollectionStore.getState().hydrateForUser(user.id);
  await useCollectionStore.getState().syncPendingCollections();
  const cards = useCollectionStore.getState().collections;
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({id: original.clientRequestId, syncStatus: 'synced'});
});
it('reuses the same request ID and uploaded photo after a lost save response', async () => {
  jest.mocked(createCollectionApi).mockRejectedValueOnce(new Error('Response lost'));
  const local = await add();
  expect(local.syncStatus).toBe('pending');
  await useCollectionStore.getState().syncPendingCollections();
  expect(uploadPhotoApi).toHaveBeenCalledTimes(1);
  expect(createCollectionApi).toHaveBeenCalledTimes(2);
  expect(jest.mocked(createCollectionApi).mock.calls[0][0].clientRequestId).toBe(jest.mocked(createCollectionApi).mock.calls[1][0].clientRequestId);
  expect(useCollectionStore.getState().collections).toHaveLength(1);
  expect(useCollectionStore.getState().getAnimalById(local.id)?.syncStatus).toBe('synced');
});
it('shares one synchronization pass between simultaneous retry actions', async () => {
  jest.mocked(uploadPhotoApi).mockResolvedValueOnce(null);
  await add();
  jest.mocked(createCollectionApi).mockClear();
  const first = useCollectionStore.getState().syncPendingCollections();
  const second = useCollectionStore.getState().syncPendingCollections();
  expect(first).toBe(second);
  await first;
  expect(createCollectionApi).toHaveBeenCalledTimes(1);
});
it('never writes a previous account capture into the newly active account', async () => {
  let finish!: (url: string) => void;
  jest.mocked(uploadPhotoApi).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  const pending = add();
  useAuthStore.setState({user: {id: 'account-b', email: 'b@example.com', name: 'B'}});
  finish('/api/v1/storage/photos/user_a_photo.jpg');
  await expect(pending).rejects.toThrow('account changed');
  expect(createCollectionApi).not.toHaveBeenCalled();
  expect(useCollectionStore.getState().collections).toHaveLength(0);
  expect(readCollectionCache(user.id, []).collections).toHaveLength(1);
});
it('rolls back a failed favorite update instead of pretending it is synced', async () => {
  const card = await add();
  jest.mocked(updateCollectionApi).mockRejectedValueOnce(new Error('Offline'));
  await expect(useCollectionStore.getState().toggleFavorite(card.id)).rejects.toThrow('Could not save favorite');
  expect(useCollectionStore.getState().collections[0].isFavorite).toBe(false);
});

it('retains an offline rename when retrying a create whose original response was lost', async () => {
  jest.mocked(createCollectionApi).mockRejectedValueOnce(new Error('Response lost'));
  const card = await add();
  await useCollectionStore.getState().renameCollection(card.id,'New Nickname');
  jest.mocked(createCollectionApi).mockImplementationOnce(async payload=>({...remote(payload),name:'Pet'}));
  jest.mocked(updateCollectionApi).mockImplementationOnce(async (id,updates)=>({...remote({clientRequestId:id,name:'Pet',photoUrl:card.uploadedPhotoUrl!}),...updates}));
  await useCollectionStore.getState().syncPendingCollections();
  expect(updateCollectionApi).toHaveBeenCalledWith(card.clientRequestId,{name:'New Nickname'},'session');
  expect(useCollectionStore.getState().collections).toHaveLength(1);
  expect(useCollectionStore.getState().collections[0]).toMatchObject({name:'New Nickname',syncStatus:'synced'});
});

it('never recreates an account cache after its deletion tombstone', async () => {
  const {writeCollectionCache} = require('../collectionCache');
  appStorage.set(`deleted_account:${user.id}`, 'true');
  writeCollectionCache(user.id, {catalog: [], collections: [{id: 'deleted-card', userId: user.id}]});
  expect(readCollectionCache(user.id, []).collections).toEqual([]);
});
