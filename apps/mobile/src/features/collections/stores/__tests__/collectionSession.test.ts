import { useCollectionStore } from '../useCollectionStore';
import { claimGuestCollections, readCollectionCache, writeCollectionCache } from '../collectionCache';
import { useAuthStore } from '../../../auth/stores/useAuthStore';
import { appStorage, StorageKeys } from '../../../../core/storage/mmkv';
import { claimStarterGiftApi, fetchCatalogApi, fetchUserCollectionsApi, fetchCollectionSummaryApi, fetchStarterGiftStatusApi, StarterGiftClaimError } from '../../api/collectionApi';
import { giftClaimedKey, giftServerKey, LOCAL_STARTER_GIFT_ID, markStarterGiftClaimed } from '../starterGift';
import { CatalogAnimal, UserCollectionItem } from '../../types';
import { waitFor } from '@testing-library/react-native';

jest.mock('../../api/collectionApi', () => ({
  ...jest.requireActual('../../api/collectionApi'),
  fetchCatalogApi: jest.fn(), fetchUserCollectionsApi: jest.fn(), fetchCollectionSummaryApi: jest.fn(), claimStarterGiftApi: jest.fn(),
  fetchStarterGiftStatusApi: jest.fn(),
}));
const account = (id: string) => ({ id, name: id, email: `${id}@example.com` });
const catalog: CatalogAnimal[] = [{ id: 'cat', code: 'cat', name: 'Cat', category: 'Domestic', catalogOrder: 1, isCaught: false, caughtCount: 0, isFavorite: false }];
const fish = (userId: string): UserCollectionItem => ({ id: `fish-${userId}`, userId, name: 'Goldfish', animalSpecies: 'Goldfish', category: 'Marine',
  photoUrl: 'https://example.com/fish.jpg', story: 'My fish', favFood: '', temperament: '', isFavorite: false });

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchCatalogApi).mockReset();
  jest.mocked(fetchUserCollectionsApi).mockReset();
  jest.mocked(fetchCollectionSummaryApi).mockReset();
  jest.mocked(claimStarterGiftApi).mockReset();
  jest.mocked(fetchStarterGiftStatusApi).mockReset();
  appStorage.clearAll();
  useCollectionStore.setState({ ownerId: null, catalog, collections: [], loadError: null, isLoading: false, starterGiftAvailable: false });
  useAuthStore.setState({ user: account('a'), tokens: { accessToken: 'session-a' }, isAuthenticated: true });
  jest.mocked(fetchCatalogApi).mockResolvedValue(catalog);
  jest.mocked(fetchUserCollectionsApi).mockResolvedValue([]);
  jest.mocked(fetchCollectionSummaryApi).mockResolvedValue(null);
  jest.mocked(fetchStarterGiftStatusApi).mockResolvedValue('available');
});

it('preserves the full cached album when catalog loads but protected history is rejected', async () => {
  writeCollectionCache('a', { catalog, collections: [fish('a')] });
  useCollectionStore.getState().hydrateForUser('a');
  jest.mocked(fetchUserCollectionsApi).mockRejectedValue(new Error('401'));
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().collections).toEqual([fish('a')]);
  expect(useCollectionStore.getState().loadError).toContain('Saved discoveries are still available');
  expect(readCollectionCache('a', catalog).collections).toEqual([fish('a')]);
});

it('loads history immediately after a successful re-login', async () => {
  jest.mocked(fetchUserCollectionsApi).mockResolvedValue([fish('a')]);
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().getGalleryGrid().find(item => item.species === 'Goldfish')?.isLocked).toBe(false);
  expect(readCollectionCache('a', catalog).collections).toEqual([expect.objectContaining(fish('a'))]);
});

it('restores separate album caches when switching accounts and returning', () => {
  writeCollectionCache('a', { catalog, collections: [fish('a')] });
  writeCollectionCache('b', { catalog, collections: [] });
  useCollectionStore.getState().hydrateForUser('a');
  useAuthStore.setState({ user: account('b'), tokens: { accessToken: 'session-b' } });
  expect(useCollectionStore.getState().collections).toEqual([]);
  useAuthStore.setState({ user: account('a'), tokens: { accessToken: 'session-a' } });
  expect(useCollectionStore.getState().collections).toEqual([fish('a')]);
});

it('ignores a late album response from a previous account', async () => {
  let finish!: (items: UserCollectionItem[]) => void;
  jest.mocked(fetchUserCollectionsApi).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const pending = useCollectionStore.getState().loadCollections();
  useAuthStore.setState({ user: account('b'), tokens: { accessToken: 'session-b' } });
  finish([fish('a')]);
  await pending;
  expect(useCollectionStore.getState().ownerId).toBe('b');
  expect(useCollectionStore.getState().collections).toEqual([]);
});

it('migrates old shared caches by record owner without exposing another account’s photos', () => {
  appStorage.set(StorageKeys.COLLECTIONS_DATA, JSON.stringify([fish('a'), fish('b')]));
  appStorage.set(StorageKeys.CATALOG_DATA, JSON.stringify([{ ...catalog[0], isCaught: true, userPhotoUrl: 'private-photo.jpg' }]));
  const migrated = readCollectionCache('a', catalog);
  expect(migrated.collections).toEqual([fish('a')]);
  expect(migrated.catalog[0]).toMatchObject({ isCaught: false, userPhotoUrl: null });
});

it('keeps anonymous starter gifts for the first account without granting them to another account', () => {
  const gift = { ...fish('local_user'), id: 'local_coll_gift', name: 'Hippopotamus' };
  writeCollectionCache('local_user', { catalog, collections: [gift] });
  claimGuestCollections('a', catalog);
  claimGuestCollections('b', catalog);
  expect(readCollectionCache('a', catalog).collections).toEqual([{ ...gift, userId: 'a' }]);
  expect(readCollectionCache('b', catalog).collections).toEqual([]);
});

it('does not import an old guest gift again after logout and login', async () => {
  const hippo = {...catalog[0], id: 'hippo', code: 'hippopotamus', name: 'Hippopotamus'};
  const gift: UserCollectionItem = {...fish('a'), id: 'server-gift', animalId: 'hippo', animalCode: 'hippopotamus',
    animalSpecies: 'Hippopotamus', name: 'Hippopotamus', source: 'starter_gift'};
  appStorage.set('starterGiftClaimed', 'true');
  appStorage.set('starterGiftOwner', 'a');
  appStorage.set(giftServerKey('a'), gift.id);
  writeCollectionCache('a', {catalog: [hippo], collections: [fish('a'), gift]});
  useCollectionStore.getState().hydrateForUser('a');
  writeCollectionCache('local_user', {catalog: [hippo], collections: [{...gift, id: LOCAL_STARTER_GIFT_ID, userId: 'local_user'}]});

  useAuthStore.setState({user: null, tokens: null, isInitializing: false});
  useAuthStore.setState({user: account('a'), tokens: {accessToken: 'new-session'}});
  expect(useCollectionStore.getState().collections.map(item => item.id)).toEqual(['fish-a', gift.id]);
  jest.mocked(fetchCatalogApi).mockResolvedValue([hippo]);
  jest.mocked(fetchUserCollectionsApi).mockResolvedValue([fish('a'), gift]);
  await useCollectionStore.getState().loadCollections();
  expect(readCollectionCache('a', [hippo]).collections.map(item => item.id)).toEqual(['fish-a', gift.id]);
  expect(claimStarterGiftApi).not.toHaveBeenCalled();
});

it('repairs an already duplicated gift cache without removing photographed hippos', () => {
  const gift: UserCollectionItem = {...fish('a'), id: 'server-gift', source: 'starter_gift', animalCode: 'hippopotamus'};
  const localGift = {...gift, id: LOCAL_STARTER_GIFT_ID};
  const capture: UserCollectionItem = {...gift, id: 'local_coll_photo', source: 'capture', photoUrl: 'file:///my-hippo.jpg'};
  // Bypass the cache writer to reproduce data saved by earlier app versions.
  appStorage.set('collection_snapshot:a', JSON.stringify({catalog, collections: [localGift, gift, capture, fish('a')]}));
  useCollectionStore.getState().hydrateForUser('a');
  expect(useCollectionStore.getState().collections.map(item => item.id)).toEqual([gift.id, capture.id, 'fish-a']);
  expect(appStorage.getString(giftServerKey('a'))).toBe(gift.id);
});

it('keeps a photographed guest hippo separate from its starter gift during migration', () => {
  appStorage.set('starterGiftClaimed', 'true');
  const gift: UserCollectionItem = {...fish('local_user'), id: LOCAL_STARTER_GIFT_ID, animalCode: 'hippopotamus', source: 'starter_gift'};
  const capture: UserCollectionItem = {...gift, id: 'local_coll_photo', source: 'capture', photoUrl: 'file:///hippo.jpg'};
  writeCollectionCache('local_user', {catalog, collections: [gift, capture]});
  claimGuestCollections('a', catalog);
  const migrated = readCollectionCache('a', catalog).collections;
  expect(migrated.map(item => item.id)).toEqual([gift.id, capture.id]);
  expect(migrated[1].photoUrl).toBe(capture.photoUrl);
});

it('recovers a legacy gift receipt into the real account and persists the server card without duplicates', async () => {
  const hippo = { ...catalog[0], id: 'hippo', code: 'hippopotamus', name: 'Hippopotamus' };
  useCollectionStore.setState({ catalog: [hippo], collections: [fish('a')] });
  appStorage.set('starterGiftClaimed', 'true');
  const gift = { ...fish('a'), id: 'server-gift', animalId: 'hippo', animalCode: 'hippopotamus', animalSpecies: 'Hippopotamus', name: 'Hippopotamus' };
  jest.mocked(claimStarterGiftApi).mockResolvedValue(gift);
  jest.mocked(fetchUserCollectionsApi).mockResolvedValue([fish('a')]);
  jest.mocked(fetchCatalogApi).mockResolvedValue([hippo]);
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().collections.map(item => item.id)).toEqual(['fish-a', 'server-gift']);
  expect(appStorage.getString(giftServerKey('a'))).toBe('server-gift');
  expect(useCollectionStore.getState().collections.some(item => item.id === LOCAL_STARTER_GIFT_ID)).toBe(false);
  jest.mocked(fetchUserCollectionsApi).mockResolvedValue([fish('a'), gift]);
  await useCollectionStore.getState().loadCollections();
  expect(claimStarterGiftApi).toHaveBeenCalledTimes(1);
  expect(readCollectionCache('a', [hippo]).collections).toHaveLength(2);
});

it('keeps the pending gift visible when backend claiming is temporarily unavailable', async () => {
  const hippo = { ...catalog[0], id: 'hippo', code: 'hippopotamus', name: 'Hippopotamus' };
  useCollectionStore.setState({ catalog: [hippo] });
  appStorage.set('starterGiftClaimed', 'true');
  jest.mocked(claimStarterGiftApi).mockRejectedValue(new Error('Offline'));
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().collections[0].id).toBe(LOCAL_STARTER_GIFT_ID);
  expect(useCollectionStore.getState().loadError).toContain('starter gift');
});

it('does not restore a gift that was intentionally deleted from the server', async () => {
  const hippo = { ...catalog[0], id: 'hippo', code: 'hippopotamus', name: 'Hippopotamus' };
  useCollectionStore.setState({ catalog: [hippo] });
  appStorage.set('starterGiftClaimed', 'true');
  jest.mocked(claimStarterGiftApi).mockRejectedValue(new StarterGiftClaimError(410));
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().collections).toEqual([]);
  await useCollectionStore.getState().loadCollections();
  expect(claimStarterGiftApi).toHaveBeenCalledTimes(1);
});

it('offers and saves one gift for a second account, then restores each account’s own album', async () => {
  const hippo = {...catalog[0], id: 'hippo', code: 'hippopotamus', name: 'Hippopotamus'};
  const gifts = new Map<string, UserCollectionItem>();
  const giftA: UserCollectionItem = {...fish('a'), id: 'gift-a', source: 'starter_gift', name: 'My Hippo', animalSpecies: 'Hippopotamus'};
  gifts.set('a', giftA);
  appStorage.set('hasSeenOnboarding', 'true');
  appStorage.set('starterGiftClaimed', 'true');
  appStorage.set('starterGiftOwner', 'a');
  appStorage.set(giftServerKey('a'), giftA.id);
  appStorage.set('guest_collection_owner', 'a');
  jest.mocked(fetchCatalogApi).mockResolvedValue([hippo]);
  jest.mocked(fetchUserCollectionsApi).mockImplementation(async () => {
    const id = useAuthStore.getState().user!.id;
    return [...(id === 'a' ? [fish('a')] : []), ...(gifts.has(id) ? [gifts.get(id)!] : [])];
  });
  jest.mocked(fetchStarterGiftStatusApi).mockImplementation(async () => gifts.has(useAuthStore.getState().user!.id) ? 'claimed' : 'available');
  jest.mocked(claimStarterGiftApi).mockImplementation(async () => {
    const id = useAuthStore.getState().user!.id;
    const gift: UserCollectionItem = {...fish(id), id: `gift-${id}`, source: 'starter_gift', animalSpecies: 'Hippopotamus', name: 'Hippopotamus'};
    gifts.set(id, gift);
    return gift;
  });
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().starterGiftAvailable).toBe(false);
  useAuthStore.setState({user: null, tokens: null, isInitializing: false});
  useAuthStore.setState({user: account('b'), tokens: {accessToken: 'session-b'}});
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().starterGiftAvailable).toBe(true);
  expect(useCollectionStore.getState().collections).toEqual([]);

  useCollectionStore.getState().claimStarterGift();
  expect(useCollectionStore.getState().starterGiftAvailable).toBe(false);
  expect(useCollectionStore.getState().collections).toEqual([expect.objectContaining({userId: 'b', id: LOCAL_STARTER_GIFT_ID})]);
  await waitFor(() => expect(useCollectionStore.getState().collections[0]?.id).toBe('gift-b'));
  expect(appStorage.getString(giftClaimedKey('b'))).toBe('true');
  useCollectionStore.getState().claimStarterGift();
  await waitFor(() => expect(useCollectionStore.getState().isLoading).toBe(false));
  expect(useCollectionStore.getState().collections).toHaveLength(1);
  expect(claimStarterGiftApi).toHaveBeenCalledTimes(1);

  useAuthStore.setState({user: account('a'), tokens: {accessToken: 'session-a'}});
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().collections.map(item => item.id)).toEqual(['fish-a', 'gift-a']);
  expect(useCollectionStore.getState().collections[1].name).toBe('My Hippo');
  expect(useCollectionStore.getState().starterGiftAvailable).toBe(false);
});

it('does not re-offer a removed gift on a new device or when local claiming is retried', async () => {
  jest.mocked(fetchStarterGiftStatusApi).mockResolvedValue('removed');
  const hippo = {...catalog[0], code: 'hippopotamus'};
  jest.mocked(fetchCatalogApi).mockResolvedValue([hippo]);
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().starterGiftAvailable).toBe(false);
  useCollectionStore.getState().claimStarterGift();
  await waitFor(() => expect(useCollectionStore.getState().isLoading).toBe(false));
  expect(useCollectionStore.getState().collections).toEqual([]);
  expect(claimStarterGiftApi).not.toHaveBeenCalled();
});

it('waits for a successful account entitlement check before offering a gift', async () => {
  jest.mocked(fetchStarterGiftStatusApi).mockRejectedValueOnce(new Error('Offline'));
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().starterGiftAvailable).toBe(false);
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().starterGiftAvailable).toBe(true);
  expect(claimStarterGiftApi).not.toHaveBeenCalled();
});

it('ignores a late entitlement response when switching accounts', async () => {
  let finish!: (status: 'available') => void;
  jest.mocked(fetchStarterGiftStatusApi).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  const pending = useCollectionStore.getState().loadCollections();
  await waitFor(() => expect(fetchStarterGiftStatusApi).toHaveBeenCalled());
  useAuthStore.setState({user: account('b'), tokens: {accessToken: 'session-b'}});
  finish('available');
  await pending;
  expect(useCollectionStore.getState()).toMatchObject({ownerId: 'b', starterGiftAvailable: false, collections: []});
});

it('syncs the first guest gift only to its owner while the next account remains eligible', async () => {
  useAuthStore.setState({user: null, tokens: null, isInitializing: false});
  const hippo = {...catalog[0], code: 'hippopotamus'};
  useCollectionStore.setState({catalog: [hippo]});
  useCollectionStore.getState().claimStarterGift();
  useAuthStore.setState({user: account('a'), tokens: {accessToken: 'session-a'}});
  const gift: UserCollectionItem = {...fish('a'), id: 'gift-a', source: 'starter_gift'};
  jest.mocked(claimStarterGiftApi).mockResolvedValue(gift);
  await useCollectionStore.getState().loadCollections();
  expect(appStorage.getString(giftClaimedKey('a'))).toBe('true');
  expect(appStorage.getString(giftClaimedKey('local_user'))).toBeUndefined();
  useAuthStore.setState({user: null, tokens: null});
  useAuthStore.setState({user: account('b'), tokens: {accessToken: 'session-b'}});
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState()).toMatchObject({collections: [], starterGiftAvailable: true});
  expect(claimStarterGiftApi).toHaveBeenCalledTimes(1);
});

it('keeps a second account’s offline gift pending only for that account', async () => {
  const hippo = {...catalog[0], code: 'hippopotamus'};
  appStorage.set('starterGiftClaimed', 'true');
  appStorage.set('starterGiftOwner', 'a');
  appStorage.set(giftServerKey('a'), 'gift-a');
  useAuthStore.setState({user: account('b'), tokens: {accessToken: 'session-b'}});
  useCollectionStore.setState({catalog: [hippo]});
  jest.mocked(claimStarterGiftApi).mockRejectedValue(new Error('Offline'));
  useCollectionStore.getState().claimStarterGift();
  await waitFor(() => expect(useCollectionStore.getState().isLoading).toBe(false));
  expect(useCollectionStore.getState().loadError).toContain('starter gift');
  expect(readCollectionCache('b', [hippo]).collections).toEqual([expect.objectContaining({userId: 'b', id: LOCAL_STARTER_GIFT_ID})]);
  useAuthStore.setState({user: account('a'), tokens: {accessToken: 'session-a'}});
  expect(useCollectionStore.getState().collections).toEqual([]);
  useAuthStore.setState({user: account('b'), tokens: {accessToken: 'session-b'}});
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().collections).toHaveLength(1);
  expect(claimStarterGiftApi).toHaveBeenCalledTimes(2);
});

it('ignores an old claim response after a new account claims its own local gift', async () => {
  const hippo = {...catalog[0], code: 'hippopotamus'};
  useCollectionStore.setState({catalog: [hippo]});
  jest.mocked(fetchCatalogApi).mockResolvedValue([hippo]);
  let finish!: (gift: UserCollectionItem) => void;
  jest.mocked(claimStarterGiftApi).mockImplementationOnce(() => new Promise(resolve => {finish = resolve;}));
  markStarterGiftClaimed('a');
  const firstLoad = useCollectionStore.getState().loadCollections();
  await waitFor(() => expect(claimStarterGiftApi).toHaveBeenCalledTimes(1));
  useAuthStore.setState({user: account('b'), tokens: {accessToken: 'session-b'}});
  jest.mocked(claimStarterGiftApi).mockRejectedValueOnce(new Error('Offline'));
  useCollectionStore.getState().claimStarterGift();
  await waitFor(() => expect(useCollectionStore.getState().isLoading).toBe(false));
  finish({...fish('a'), id: 'gift-a', source: 'starter_gift'});
  await firstLoad;
  expect(useCollectionStore.getState().collections).toEqual([expect.objectContaining({userId: 'b', id: LOCAL_STARTER_GIFT_ID})]);
  expect(appStorage.getString(giftServerKey('b'))).toBeUndefined();
  expect(readCollectionCache('b', [hippo]).collections[0].userId).toBe('b');
});
