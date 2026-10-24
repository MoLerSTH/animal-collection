import { File } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { retainCapture } from './captureFiles';
import { catalogForCollection, uniqueCollections } from './catalogMatching';
import { create } from 'zustand';
import {
  CatalogAnimal,
  UserCollectionItem,
  CollectionSummary,
  CreateCollectionPayload,
  IdentificationFacts,
} from '../types';
import { AnimalItem } from '../../../app/types';
import { useAuthStore } from '../../auth/stores/useAuthStore';
import { claimGuestCollections, readCollectionCache, writeCollectionCache } from './collectionCache';
import { appStorage } from '../../../core/storage/mmkv';
import { giftRemovedKey, giftServerKey, hasPendingStarterGift, isLocalStarterGift, LOCAL_STARTER_GIFT_ID, markStarterGiftClaimed, reconcileStarterGifts, restoreStarterGift } from './starterGift';
import {
  fetchCatalogApi,
  fetchUserCollectionsApi,
  fetchCollectionSummaryApi,
  uploadPhotoApi,
  createCollectionApi,
  updateCollectionApi,
  renameCollectionApi,
  NameSaveTimeoutError,
  resolvePhotoUrl,
  claimStarterGiftApi,
  StarterGiftClaimError,
  fetchStarterGiftStatusApi,
} from '../api/collectionApi';

export const INITIAL_CATALOG_FALLBACK: CatalogAnimal[] = [
  {
    id: 'a1',
    code: 'hippopotamus',
    name: 'Hippopotamus',
    scientificName: 'Choeropsis liberiensis',
    category: 'Zoo',
    defaultImageUrl: 'https://static.bangkokpost.com/media/content/20240913/c1_2865088.jpg',
    defaultStory: 'A delightfully bouncy pygmy hippo who loves water baths and crunchy cabbage.',
    defaultFavFood: 'Golden Berries',
    defaultTemperament: 'Extremely Shy',
    catalogOrder: 1,
    isCaught: false,
    userPhotoUrl: null,
    caughtCount: 0,
    isFavorite: false,
  },
  {
    id: 'a2',
    code: 'badger',
    name: 'Badger',
    scientificName: 'Meles meles',
    category: 'Wild',
    defaultImageUrl: 'https://images.unsplash.com/photo-1579613832125-5d34a13ffe0a?w=800&auto=format&fit=crop',
    defaultStory: 'A tenacious digger with distinctive stripes.',
    defaultFavFood: 'Earthworms',
    defaultTemperament: 'Curious',
    catalogOrder: 2,
    isCaught: false,
    userPhotoUrl: undefined,
    caughtCount: 0,
    isFavorite: false,
  },
  {
    id: 'a3',
    code: 'red_fox',
    name: 'Red Fox',
    scientificName: 'Vulpes vulpes',
    category: 'Wild',
    defaultImageUrl: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?w=800&auto=format&fit=crop',
    defaultStory: 'Clever woodland wanderer with a fluffy rust-colored tail.',
    defaultFavFood: 'Berries & Small Prey',
    defaultTemperament: 'Playful',
    catalogOrder: 3,
    isCaught: false,
    userPhotoUrl: undefined,
    caughtCount: 0,
    isFavorite: false,
  },
  {
    id: 'a4',
    code: 'monkey',
    name: 'Monkey',
    scientificName: 'Macaca fascicularis',
    category: 'Wild',
    defaultImageUrl: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=800&auto=format&fit=crop',
    defaultStory: 'A quick-witted climber searching for tasty fruit snacks.',
    defaultFavFood: 'Bananas',
    defaultTemperament: 'Mischievous',
    catalogOrder: 4,
    isCaught: false,
    userPhotoUrl: undefined,
    caughtCount: 0,
    isFavorite: false,
  },
  ...[
    'Asian Elephant',
    'Capybara',
    'Sea Otter',
    'Emperor Penguin',
    'Red Panda',
    'Koala',
    'Giant Panda',
    'Fennec Fox',
    'Bengal Tiger',
    'African Lion',
    'Meerkat',
    'Three-Toed Sloth',
    'Alpaca',
    'Raccoon',
  ].map((name, index) => ({
    id: `a${index + 5}`,
    code: name.toLowerCase().replace(/[\s-]+/g, '_'),
    name,
    category: 'Wild' as const,
    catalogOrder: index + 5,
    isCaught: false,
    caughtCount: 0,
    isFavorite: false,
  })),
];

export interface CollectionState {
  ownerId: string | null;
  loadError: string | null;
  catalog: CatalogAnimal[];
  collections: UserCollectionItem[];
  summary: CollectionSummary;
  isLoading: boolean;
  isSubmitting: boolean;
  isSyncing: boolean;
  starterGiftAvailable: boolean;
  pendingNames: Record<string, string>;
  syncPendingCollections: () => Promise<void>;

  // Actions
  loadCollections: () => Promise<void>;
  hydrateForUser: (userId: string) => void;
  claimStarterGift: () => void;
  addCollection: (params: Omit<IdentificationFacts, 'source'> & {
    photoUri: string;
    latitude?: number;
    longitude?: number;
    animalId?: string;
    name: string;
    story?: string;
    favFood?: string;
    temperament?: string;
    isFavorite?: boolean;
  }) => Promise<UserCollectionItem>;
  updateIdentification: (id: string, facts: Omit<IdentificationFacts, 'source' | 'capturedAt'>) => Promise<void>;
  renameCollection: (id: string, name: string) => Promise<void>;
  toggleFavorite: (collectionOrAnimalId: string) => Promise<void>;
  getGalleryGrid: () => AnimalItem[];
  getAnimalById: (id: string) => AnimalItem | undefined;
}

let loadVersion = 0;
let ownerVersion = 0;
const pendingNameFor = (names: Record<string, string>, item: UserCollectionItem) => names[item.id] ?? (item.localId ? names[item.localId] : undefined);
const photoFor = (item?: UserCollectionItem) => {
  if (item?.localPhotoUri) {
    try { if (new File(item.localPhotoUri).exists) return item.localPhotoUri; } catch {}
  }
  return item?.photoUrl;
};
const syncing = new Map<string, Promise<void>>();
const activeUserId = () => useAuthStore.getState().user?.id || 'local_user';

export const useCollectionStore = create<CollectionState>((set, get) => ({
  ownerId: null,
  loadError: null,
  catalog: INITIAL_CATALOG_FALLBACK,
  collections: [],
  summary: {
    caughtCount: 0,
    totalCatalog: 18,
    favoritesCount: 0,
  },
  isLoading: false,
  isSubmitting: false,
  isSyncing: false,
  starterGiftAvailable: false,
  pendingNames: {},

  hydrateForUser: userId => {
    loadVersion += 1;
    const previous = get();
    if (previous.ownerId !== userId) ownerVersion += 1;
    if (previous.ownerId && previous.ownerId !== userId && !appStorage.getString(`deleted_account:${previous.ownerId}`)) {
      writeCollectionCache(previous.ownerId, previous);
    }
    const snapshot = readCollectionCache(userId, get().catalog);
    set({ ...snapshot, ownerId: userId, starterGiftAvailable: false, pendingNames: previous.ownerId === userId ? previous.pendingNames : {}, isLoading: false, isSubmitting: false, isSyncing: false, loadError: null,
      summary: { caughtCount: snapshot.collections.length, totalCatalog: snapshot.catalog.length,
        favoritesCount: snapshot.collections.filter(item => item.isFavorite).length } });
  },

  loadCollections: async () => {
    const userId = activeUserId();
    if (get().ownerId !== userId) get().hydrateForUser(userId);
    set({ collections: restoreStarterGift(userId, get().catalog, get().collections) });
    writeCollectionCache(userId, get());
    const version = ++loadVersion;
    set({ isLoading: true, loadError: null });
    await get().syncPendingCollections();
    if (version !== loadVersion || activeUserId() !== userId) return;
    const token = useAuthStore.getState().tokens?.accessToken;
    const pendingGift = userId !== 'local_user' && hasPendingStarterGift(userId);
    let giftRemoved = false;
    const [catalogData, collectionsData, summaryData, gift, giftStatus] = await Promise.all([
      fetchCatalogApi(token).catch(() => null),
      fetchUserCollectionsApi(token).catch(() => null),
      fetchCollectionSummaryApi(token).catch(() => null),
      pendingGift ? claimStarterGiftApi().catch(error => {
        giftRemoved = error instanceof StarterGiftClaimError && error.status === 410;
        return null;
      }) : Promise.resolve(null),
      userId !== 'local_user' ? fetchStarterGiftStatusApi(token).catch(() => null) : Promise.resolve(null),
    ]);
    if (version !== loadVersion || activeUserId() !== userId) return;
    const previous = get();
    giftRemoved = giftRemoved || giftStatus === 'removed';
    // A rejected request is not an empty album. Preserve the entire last snapshot.
    let collections = collectionsData === null ? previous.collections : [
      ...collectionsData.filter(item => item.userId === userId).map(item => ({...item, syncStatus: 'synced' as const, localPhotoUri: previous.collections.find(local => local.id === item.id || local.clientRequestId === item.id)?.localPhotoUri, localId: previous.collections.find(local => local.id === item.id || local.clientRequestId === item.id)?.localId})),
      ...previous.collections.filter(item => item.userId === userId &&
        (item.id.startsWith('local_coll_') || pendingNameFor(previous.pendingNames, item) !== undefined) &&
        !collectionsData.some(remote => remote.id === item.id || remote.id === item.clientRequestId)),
    ];
    if (gift || giftRemoved) collections = collections.filter(item => item.id !== LOCAL_STARTER_GIFT_ID);
    if (gift) {
      const confirmedGift = {...gift, localId: previous.collections.find(isLocalStarterGift)?.id || previous.collections.find(item => item.id === gift.id)?.localId};
      collections = [...new Map([...collections, confirmedGift].map(item => [item.id, item])).values()];
      appStorage.set(giftServerKey(userId), gift.id);
    }
    if (giftRemoved) appStorage.set(giftRemovedKey(userId), 'true');
    collections = reconcileStarterGifts(userId, collections);
    const catalog = collectionsData !== null && catalogData?.length ? catalogData : previous.catalog;
    set({ catalog, collections, isLoading: false,
      starterGiftAvailable: giftStatus === 'available' && !hasPendingStarterGift(userId) &&
        !appStorage.getString(giftServerKey(userId)) && !appStorage.getString(giftRemovedKey(userId)) &&
        !collections.some(item => isLocalStarterGift(item) || item.source === 'starter_gift'),
      loadError: collectionsData === null ? 'Could not sync your album. Saved discoveries are still available. Pull down to retry.'
        : pendingGift && !gift && !giftRemoved ? 'Your starter gift is saved on this device. Pull down to retry syncing it.' : null,
    });
    const grid = get().getGalleryGrid().filter(animal => !animal.isLocked);
    set({ summary: (!pendingGift && summaryData) || { caughtCount: new Set(grid.map(animal => animal.species.toLowerCase())).size,
      totalCatalog: catalog.length, favoritesCount: collections.filter(item => item.isFavorite).length } });
    writeCollectionCache(userId, { catalog, collections });
  },

  claimStarterGift: () => {
    const userId = activeUserId();
    if (get().ownerId !== userId) get().hydrateForUser(userId);
    if (!get().catalog.some(animal => animal.code === 'hippopotamus')) throw new Error('The starter gift is not available yet.');
    markStarterGiftClaimed(userId);
    set({ starterGiftAvailable: false, collections: restoreStarterGift(userId, get().catalog, get().collections) });
    writeCollectionCache(userId, get());
    if (userId !== 'local_user') void get().loadCollections();
  },

  addCollection: async (params) => {
    const userId = activeUserId();
    if (get().isSubmitting) throw new Error('A discovery is already being saved.');
    if (get().ownerId !== userId) get().hydrateForUser(userId);
    set({ isSubmitting: true });
    const token = useAuthStore.getState().tokens?.accessToken;

    let createdItem: UserCollectionItem;
    try {
      const requestId = randomUUID();
      const photoUrl = retainCapture(params.photoUri, requestId);
      createdItem = {
        ...params, id: `local_coll_${requestId}`, clientRequestId: requestId, userId,
        animalSpecies: params.identifiedSpecies || params.name, category: 'Wild', photoUrl,
        localPhotoUri: photoUrl.startsWith('file://') ? photoUrl : undefined,
        source: 'capture', syncStatus: 'pending', story: params.story || '', favFood: params.favFood || '',
        temperament: params.temperament || '', isFavorite: Boolean(params.isFavorite), caughtAt: new Date().toISOString(),
      };
    } catch (error) { set({isSubmitting: false}); throw error; }

    if (activeUserId() !== userId) throw new Error('The account changed. Please try again.');
    // 3. Update store state and catalog unlocked state
    set((state) => {
      const updatedCollections = [createdItem, ...state.collections];
      const cSpecies = (createdItem.animalSpecies || '').trim().toLowerCase();
      const cName = (createdItem.name || '').trim().toLowerCase();

      const updatedCatalog = state.catalog.map((c) => {
        const catName = c.name.trim().toLowerCase();
        const catCode = c.code.trim().toLowerCase().replace(/_/g, ' ');

        const matches =
          c.id === createdItem.animalId || c.code === createdItem.animalCode ||
          cSpecies === catName || cName === catName || cName === catCode;

        if (matches) {
          return {
            ...c,
            isCaught: true,
            userPhotoUrl: createdItem.photoUrl,
            caughtCount: c.caughtCount + 1,
            isFavorite: c.isFavorite || createdItem.isFavorite,
          };
        }
        return c;
      });

      // Calculate distinct species caught + custom captures
      const distinctSpecies = new Set<string>();
      updatedCatalog.forEach((a) => {
        if (a.isCaught) distinctSpecies.add(a.id);
      });
      updatedCollections.forEach((col) => {
        if (!col.animalId) distinctSpecies.add(col.id);
      });

      const caughtCount = distinctSpecies.size;
      const favoritesCount = updatedCollections.filter((c) => c.isFavorite).length;

      return {
        collections: updatedCollections,
        catalog: updatedCatalog,
        summary: {
          caughtCount,
          totalCatalog: updatedCatalog.length,
          favoritesCount,
        },
        isSubmitting: false,
      };
    });

    writeCollectionCache(userId, get());
    await get().syncPendingCollections();
    if (activeUserId() !== userId) throw new Error('The account changed. Please try again.');
    return get().collections.find(item => item.id === createdItem.id || item.id === createdItem.clientRequestId) || createdItem;
  },

  syncPendingCollections: () => {
    const userId = activeUserId();
    if (userId === 'local_user' || appStorage.getString(`deleted_account:${userId}`)) return Promise.resolve();
    const existing = syncing.get(userId);
    if (existing) return existing;
    const job = (async () => {
      set({isSyncing: true});
      const pending = get().collections.filter(item => item.userId === userId && item.id.startsWith('local_coll_') && !isLocalStarterGift(item));
      for (const original of pending) {
        if (activeUserId() !== userId || appStorage.getString(`deleted_account:${userId}`)) return;
        try {
          let item = get().collections.find(entry => entry.id === original.id);
          if (!item) continue;
          // Upgrade legacy local cards before any network request; retries reuse this ID.
          const clientRequestId = item.clientRequestId || randomUUID();
          item = {...item, clientRequestId, syncStatus: 'pending'};
          if (item.photoUrl.startsWith('file://') && !item.localPhotoUri?.includes('/captures/')) {
            const uri = retainCapture(item.localPhotoUri || item.photoUrl, clientRequestId);
            item = {...item, localPhotoUri: uri, photoUrl: uri};
          }
          set(state => ({collections: state.collections.map(entry => entry.id === original.id ? item! : entry)}));
          writeCollectionCache(userId, get());
          let uploaded = item.uploadedPhotoUrl;
          if (!uploaded) {
            uploaded = item.photoUrl.startsWith('file://') ? await uploadPhotoApi(item.localPhotoUri || item.photoUrl) || undefined : item.photoUrl;
            if (!uploaded) throw new Error('Photo upload failed');
            if (activeUserId() !== userId) return;
            item = {...item, uploadedPhotoUrl: uploaded};
            set(state => ({collections: state.collections.map(entry => entry.id === original.id ? item! : entry)}));
            writeCollectionCache(userId, get());
          }
          const payload: CreateCollectionPayload = {
            clientRequestId, animalId: item.animalId || undefined, name: item.name, photoUrl: uploaded,
            story: item.story, favFood: item.favFood, temperament: item.temperament, isFavorite: item.isFavorite,
            latitude: item.latitude ?? undefined, longitude: item.longitude ?? undefined,
            identifiedSpecies: item.identifiedSpecies, animalType: item.animalType, habitatTags: item.habitatTags, capturedAt: item.capturedAt,
          };
          let remote = await createCollectionApi(payload);
          if (activeUserId() !== userId || appStorage.getString(`deleted_account:${userId}`)) return;
          // A previous create may have committed before its response was lost.
          // Apply a later offline rename after the idempotent retry returns it.
          if (remote.name !== item.name) {
            remote = await updateCollectionApi(remote.id, {name: item.name}, useAuthStore.getState().tokens?.accessToken);
            if (activeUserId() !== userId || appStorage.getString(`deleted_account:${userId}`)) return;
          }
          const synced = {...remote, localId: original.id, localPhotoUri: item.localPhotoUri, clientRequestId, syncStatus: 'synced' as const};
          set(state => ({collections: [synced, ...state.collections.filter(entry => entry.id !== original.id && entry.id !== remote.id)]}));
          writeCollectionCache(userId, get());
        } catch (error) {
          if (activeUserId() !== userId || appStorage.getString(`deleted_account:${userId}`)) return;
          set(state => ({collections: state.collections.map(entry => entry.id === original.id ? {...entry, syncStatus: 'pending', syncError: error instanceof Error && error.message.startsWith('Could not read') ? 'The original photo is unavailable. Please take another photo.' : 'Saved on this device. Waiting to sync to your account.'} : entry)}));
          writeCollectionCache(userId, get());
        }
      }
    })().finally(() => {
      syncing.delete(userId);
      if (activeUserId() === userId) set({isSyncing: false});
    });
    syncing.set(userId, job);
    return job;
  },

  updateIdentification: async (id, facts) => {
    const userId = activeUserId();
    const target = get().collections.find(item => item.id === id);
    if (get().isSyncing) throw new Error('Please wait for synchronization.');
    if (!target) throw new Error('Collection not found.');
    if (pendingNameFor(get().pendingNames, target) !== undefined) throw new Error('Please wait for the name to finish saving.');
    const identifiedSpecies = facts.identifiedSpecies || target.identifiedSpecies || target.animalSpecies;
    const matching = get().catalog.find(item => item.name.toLowerCase() === identifiedSpecies.toLowerCase());
    const oldSpecies = target.identifiedSpecies || target.animalSpecies;
    const followsSpecies = (target.animalId || target.animalType && target.animalType !== 'Unknown') &&
      target.name.trim().toLowerCase() === oldSpecies.trim().toLowerCase();
    const name = followsSpecies ? identifiedSpecies : target.name;
    const updated = id.startsWith('local_coll_') ? { ...target, ...facts, animalSpecies: identifiedSpecies,
      name, animalId: matching?.id, animalCode: matching?.code, category: matching?.category || 'Wild' }
      : {...target, ...await updateCollectionApi(id, facts, useAuthStore.getState().tokens?.accessToken)};
    if (activeUserId() !== userId) throw new Error('The account changed. Please try again.');
    loadVersion += 1; // A profile/album fetch started before this edit is stale.
    set(state => {
      const collections = state.collections.map(item => item.id === id ? updated : item);
      const catalog = state.catalog.map(animal => {
        const matches = collections.filter(item => item.animalId === animal.id || item.animalCode === animal.code ||
          (item.identifiedSpecies || item.animalSpecies).toLowerCase() === animal.name.toLowerCase());
        return {...animal, isCaught: matches.length > 0, caughtCount: matches.length,
          userPhotoUrl: matches[0]?.photoUrl || null, isFavorite: matches.some(item => item.isFavorite)};
      });
      return { collections, catalog, isLoading: false, summary: {...state.summary,
        caughtCount: new Set(collections.map(item => (item.identifiedSpecies || item.animalSpecies).trim().toLowerCase())).size} };
    });
    writeCollectionCache(userId, get());
  },

  renameCollection: async (id, value) => {
    const name = value.trim();
    if (!name || name.length > 100 || /[\u0000-\u001f\u007f]/.test(name)) throw new Error('Use 1–100 characters without line breaks.');
    const userId = activeUserId();
    if (get().isSyncing) throw new Error('Please wait for synchronization.');
    let target = get().collections.find(item => item.id === id || item.localId === id);
    if (!target || target.userId !== userId) throw new Error('Collection not found.');
    if (pendingNameFor(get().pendingNames, target) !== undefined) throw new Error('Please wait for the name to finish saving.');
    if (name === target.name) return;
    const key = target.id;
    const version = ownerVersion;
    const stillCurrent = () => activeUserId() === userId && ownerVersion === version;
    // Display the new name synchronously. Keep confirmed collection/cache data
    // separate so an app restart never treats an unconfirmed edit as saved.
    loadVersion += 1;
    set(state => ({isLoading: false, pendingNames: {...state.pendingNames, [key]: name}}));
    const deadline = Date.now() + 8000;
    let claimedGift = false;
    try {
      // Confirm a starter gift's canonical ID while its optimistic name remains visible.
      if (isLocalStarterGift(target)) {
        claimedGift = true;
        const gift = await claimStarterGiftApi(true);
        if (!stillCurrent()) throw new Error('The account changed. Please try again.');
        if (gift.userId !== userId) throw new Error('The service returned a different account.');
        const localId = target.id;
        target = {...gift, localId};
        appStorage.set(giftServerKey(userId), gift.id);
        set(state => ({collections: [...state.collections.filter(item => item.id !== localId && item.id !== gift.id), target!]}));
        writeCollectionCache(userId, get());
      }
      if (Date.now() >= deadline) throw new NameSaveTimeoutError();
      const updated = target.id.startsWith('local_coll_')
        ? {id: target.id, name}
        : claimedGift ? await renameCollectionApi(target.id, name, deadline - Date.now()) : await renameCollectionApi(target.id, name);
      if (!stillCurrent()) throw new Error('The account changed. Please try again.');
      if (updated.id !== target.id) throw new Error('The service returned a different card.');
      const targetId = target.id;
      loadVersion += 1; // Reject album responses started before server confirmation.
      set(state => {
        const pendingNames = {...state.pendingNames}; delete pendingNames[key];
        return {isLoading: false, pendingNames, collections: state.collections.map(item => item.id === targetId
          ? {...item, name: updated.name, identifiedSpecies: item.identifiedSpecies || catalogForCollection(item, state.catalog)?.name || item.animalSpecies} : item)};
      });
      writeCollectionCache(userId, get());
    } catch (error) {
      if (stillCurrent()) {
        set(state => {const pendingNames = {...state.pendingNames}; delete pendingNames[key]; return {pendingNames};});
      }
      throw error;
    }
  },

  toggleFavorite: async (id: string) => {
    if (get().isSyncing) throw new Error('Please wait for synchronization.');
    const userId = activeUserId();
    const state = get();
    const token = useAuthStore.getState().tokens?.accessToken;

    // Find collection or matching catalog item
    const targetColl = state.collections.find((c) => c.id === id);
    const targetCat = state.catalog.find((c) => c.id === id);

    const newFav = targetColl ? !targetColl.isFavorite : targetCat ? !targetCat.isFavorite : true;

    // Optimistically update
    set((s) => {
      const updatedColls = s.collections.map((c) => (c.id === id ? { ...c, isFavorite: newFav } : c));
      const updatedCat = s.catalog.map((c) => (c.id === id ? { ...c, isFavorite: newFav } : c));
      return {
        collections: updatedColls,
        catalog: updatedCat,
        summary: {
          ...s.summary,
          favoritesCount: updatedColls.filter((c) => c.isFavorite).length,
        },
      };
    });

    writeCollectionCache(activeUserId(), get());

    if (targetColl && !targetColl.id.startsWith('local_coll_')) {
      try {
        await updateCollectionApi(targetColl.id, { isFavorite: newFav }, token);
      } catch (err) {
        if (activeUserId() === userId) {
          set(state => ({collections: state.collections.map(item => item.id === id ? {...item, isFavorite: targetColl.isFavorite} : item)}));
          writeCollectionCache(userId, get());
        }
        throw new Error('Could not save favorite. Please check your connection and retry.');
      }
    }
  },

  getGalleryGrid: () => {
    const { catalog, collections, pendingNames } = get();
    const matchedCatalog = new Set<string>();
    // Album entries come only from real records. Stale catalog flags must never
    // manufacture a second card after an identification/name edit.
    const cards: AnimalItem[] = uniqueCollections(collections).map(item => {
      const animal = catalogForCollection(item, catalog);
      if (animal) matchedCatalog.add(animal.id);
      return {
        id: item.id, name: pendingNameFor(pendingNames, item) ?? item.name,
        species: item.identifiedSpecies || animal?.name || item.animalSpecies || item.name,
        category: animal?.category || item.category || 'Discovered',
        imageUri: resolvePhotoUrl(photoFor(item) || animal?.defaultImageUrl),
        story: item.story || animal?.defaultStory || '',
        favFood: item.favFood || animal?.defaultFavFood || '',
        temperament: item.temperament || animal?.defaultTemperament || '',
        isFavorite: Boolean(item.isFavorite), isLocked: false,
        syncStatus: item.syncStatus, syncError: item.syncError,
        identifiedSpecies: item.identifiedSpecies, animalType: item.animalType,
        habitatTags: item.habitatTags, source: item.source, capturedAt: item.capturedAt,
        caughtAt: item.caughtAt, latitude: item.latitude, longitude: item.longitude,
      };
    });
    // Retain locked entries for catalog lookup; Gallery never renders them.
    const locked: AnimalItem[] = catalog.filter(animal => !matchedCatalog.has(animal.id)).map(animal => ({
      id: animal.id, name: animal.name, species: animal.name, category: animal.category,
      imageUri: null, story: animal.defaultStory || '', favFood: animal.defaultFavFood || '',
      temperament: animal.defaultTemperament || '', isFavorite: false, isLocked: true,
    }));
    return [...cards, ...locked];
  },

  getAnimalById: (id: string) => {
    const grid = get().getGalleryGrid();
    const cleanId = (id || '').trim().toLowerCase();
    const alias = get().collections.find(item => item.localId?.toLowerCase() === cleanId);
    const exact = grid.find(
      (a) =>
        a.id.toLowerCase() === cleanId || a.id === alias?.id ||
        (cleanId.startsWith('local_coll_') && a.id.toLowerCase() === cleanId.slice(11))
    );
    return exact || grid.find(a => a.species.toLowerCase() === cleanId || a.name.toLowerCase() === cleanId);
  },
}));

// Restore the right album immediately when an account is restored, switched, or signed out.
useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) {
    if (state.user && !previous.user && !previous.isInitializing) {
      claimGuestCollections(state.user.id, useCollectionStore.getState().catalog);
    }
    useCollectionStore.getState().hydrateForUser(state.user?.id || 'local_user');
  }
});
