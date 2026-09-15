import { create } from 'zustand';
import {
  CatalogAnimal,
  UserCollectionItem,
  CollectionSummary,
  CreateCollectionPayload,
} from '../types';
import { AnimalItem } from '../../../app/types';
import { appStorage, StorageKeys } from '../../../core/storage/mmkv';
import { useAuthStore } from '../../auth/stores/useAuthStore';
import {
  fetchCatalogApi,
  fetchUserCollectionsApi,
  fetchCollectionSummaryApi,
  uploadPhotoApi,
  createCollectionApi,
  updateCollectionApi,
  resolvePhotoUrl,
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
    isCaught: true,
    userPhotoUrl: 'https://static.bangkokpost.com/media/content/20240913/c1_2865088.jpg',
    caughtCount: 1,
    isFavorite: true,
  },
  {
    id: 'a2',
    code: 'badger',
    name: 'Badger',
    scientificName: 'Meles meles',
    category: 'Wild',
    defaultImageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgbbRRTiYg6KK7sD6fI1Ck_LpO3-Gl2N9iF1u5WHi--w&s=100',
    defaultImageUrl: 'https://images.unsplash.com/photo-1579613832125-5d34a13ffe0a?w=800&auto=format&fit=crop',
    defaultStory: 'A tenacious digger with distinctive stripes.',
    defaultFavFood: 'Earthworms',
    defaultTemperament: 'Curious',
    catalogOrder: 2,
    isCaught: true,
    userPhotoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgbbRRTiYg6KK7sD6fI1Ck_LpO3-Gl2N9iF1u5WHi--w&s=100',
    caughtCount: 1,
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
    defaultImageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4Waym_Io1FYyuWSay7-apZROFHcXslt88d2BbpViTrSbOjQXn9ztRNDBw&s=10',
    defaultImageUrl: 'https://images.unsplash.com/photo-1516934024742-b461fba47600?w=800&auto=format&fit=crop',
    defaultStory: 'Clever woodland wanderer with a fluffy rust-colored tail.',
    defaultFavFood: 'Berries & Small Prey',
    defaultTemperament: 'Playful',
    catalogOrder: 3,
    isCaught: true,
    userPhotoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4Waym_Io1FYyuWSay7-apZROFHcXslt88d2BbpViTrSbOjQXn9ztRNDBw&s=10',
    caughtCount: 1,
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
    defaultImageUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkrBi-HRf2jqsISYHfow-RM0rH7jLZgZFDeuIrIqFKMwcKCEi9meLr7PRS&s=10',
    defaultImageUrl: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=800&auto=format&fit=crop',
    defaultStory: 'A quick-witted climber searching for tasty fruit snacks.',
    defaultFavFood: 'Bananas',
    defaultTemperament: 'Mischievous',
    catalogOrder: 4,
    isCaught: true,
    userPhotoUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkrBi-HRf2jqsISYHfow-RM0rH7jLZgZFDeuIrIqFKMwcKCEi9meLr7PRS&s=10',
    caughtCount: 1,
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
  catalog: CatalogAnimal[];
  collections: UserCollectionItem[];
  summary: CollectionSummary;
  isLoading: boolean;
  isSubmitting: boolean;

  // Actions
  loadCollections: () => Promise<void>;
  addCollection: (params: {
    photoUri: string;
    animalId?: string;
    name: string;
    story?: string;
    favFood?: string;
    temperament?: string;
    isFavorite?: boolean;
  }) => Promise<UserCollectionItem>;
  toggleFavorite: (collectionOrAnimalId: string) => Promise<void>;
  getGalleryGrid: () => AnimalItem[];
  getAnimalById: (id: string) => AnimalItem | undefined;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  catalog: INITIAL_CATALOG_FALLBACK,
  collections: [],
  summary: {
    caughtCount: 4,
    caughtCount: 1,
    totalCatalog: 18,
    favoritesCount: 1,
  },
  isLoading: false,
  isSubmitting: false,

  loadCollections: async () => {
    set({ isLoading: true });
    const token = useAuthStore.getState().tokens?.accessToken;

    try {
      const [catalogData, collectionsData, summaryData] = await Promise.all([
        fetchCatalogApi(token).catch(() => null),
        fetchUserCollectionsApi(token).catch(() => null),
        fetchCollectionSummaryApi(token).catch(() => null),
      ]);

      if (catalogData && catalogData.length > 0) {
        set({
          catalog: catalogData,
          collections: collectionsData || [],
          summary: summaryData || {
            caughtCount: catalogData.filter((a) => a.isCaught).length,
            totalCatalog: catalogData.length,
            favoritesCount: catalogData.filter((a) => a.isFavorite).length,
          },
          isLoading: false,
        });

        // Persist snapshot to MMKV for offline boot
        appStorage.set(StorageKeys.CATALOG_DATA, JSON.stringify(catalogData));
        if (collectionsData) {
          appStorage.set(StorageKeys.COLLECTIONS_DATA, JSON.stringify(collectionsData));
        }
        return;
      }
    } catch (err) {
      console.warn('Could not sync collections from backend API, using cached state.', err);
    }

    // Try MMKV cache fallback
    try {
      const cachedCatalog = appStorage.getString(StorageKeys.CATALOG_DATA);
      const cachedColls = appStorage.getString(StorageKeys.COLLECTIONS_DATA);
      if (cachedCatalog) {
        const parsedCatalog = JSON.parse(cachedCatalog);
        const parsedColls = cachedColls ? JSON.parse(cachedColls) : [];
        set({
          catalog: parsedCatalog,
          collections: parsedColls,
          summary: {
            caughtCount: parsedCatalog.filter((a: any) => a.isCaught).length,
            totalCatalog: parsedCatalog.length,
            favoritesCount: parsedCatalog.filter((a: any) => a.isFavorite).length,
          },
          isLoading: false,
        });
        return;
      }
    } catch {
      // Ignore parse errors
    }

    set({ isLoading: false });
  },

  addCollection: async (params) => {
    set({ isSubmitting: true });
    const token = useAuthStore.getState().tokens?.accessToken;

    let finalPhotoUrl = params.photoUri;

    // 1. Upload photo to backend if possible
    try {
      if (params.photoUri.startsWith('file://')) {
        const uploadedUrl = await uploadPhotoApi(params.photoUri, token);
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl;
        }
      }
    } catch (e) {
      console.warn('Photo upload to backend storage failed, using local URI', e);
    }

    // 2. Call backend collection API
    let createdItem: UserCollectionItem;
    try {
      const payload: CreateCollectionPayload = {
        animalId: params.animalId,
        name: params.name,
        photoUrl: finalPhotoUrl,
        story: params.story,
        favFood: params.favFood,
        temperament: params.temperament,
        isFavorite: params.isFavorite,
      };

      createdItem = await createCollectionApi(payload, token);
    } catch (err) {
      console.warn('Could not save collection to backend API, falling back to local store.', err);
      // Fallback local creation
      createdItem = {
        id: `local_coll_${Date.now()}`,
        userId: useAuthStore.getState().user?.id || 'local_user',
        animalId: params.animalId,
        animalSpecies: params.name,
        category: 'Wild',
        name: params.name,
        photoUrl: finalPhotoUrl,
        story: params.story || '',
        favFood: params.favFood || '',
        temperament: params.temperament || '',
        isFavorite: Boolean(params.isFavorite),
        caughtAt: new Date().toISOString(),
      };
    }

    // 3. Update store state and catalog unlocked state
    set((state) => {
      const updatedCollections = [createdItem, ...state.collections];
      const cSpecies = (createdItem.animalSpecies || '').trim().toLowerCase();
      const cName = (createdItem.name || '').trim().toLowerCase();

      const updatedCatalog = state.catalog.map((c) => {
        const catName = c.name.trim().toLowerCase();
        const catCode = c.code.trim().toLowerCase().replace(/_/g, ' ');

        const matches =
          c.id === createdItem.animalId ||
          c.code === createdItem.animalCode ||
          c.name.toLowerCase() === createdItem.animalSpecies.toLowerCase() ||
          c.name.toLowerCase() === createdItem.name.toLowerCase();
          (createdItem.animalId && c.id === createdItem.animalId) ||
          (createdItem.animalCode && c.code === createdItem.animalCode) ||
          cSpecies === catName ||
          cName === catName ||
          cName === catCode ||
          (cName.length >= 3 && (catName.includes(cName) || cName.includes(catName)));

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

    return createdItem;
  },

  toggleFavorite: async (id: string) => {
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

    if (targetColl) {
      try {
        await updateCollectionApi(targetColl.id, { isFavorite: newFav }, token);
      } catch (err) {
        console.warn('Failed to update favorite status on backend', err);
      }
    }
  },

  getGalleryGrid: () => {
    const { catalog, collections } = get();
    const matchedCollIds = new Set<string>();

    // 1. Grid cards for master catalog species
    const catalogCards: AnimalItem[] = catalog.map((cat, index) => {
      const catName = cat.name.trim().toLowerCase();
      const catCode = cat.code.trim().toLowerCase().replace(/_/g, ' ');

      // Look for user collection for this animal
      const matchingColl = collections.find((c) => {
        if (c.animalId && c.animalId === cat.id) return true;
        if (c.animalCode && c.animalCode === cat.code) return true;
        const cSpecies = (c.animalSpecies || '').trim().toLowerCase();
        const cName = (c.name || '').trim().toLowerCase();
        return (
          cSpecies === catName ||
          cName === catName ||
          cName === catCode ||
          (cName.length >= 3 && (catName.includes(cName) || cName.includes(catName)))
        );
      });

      if (matchingColl) {
        matchedCollIds.add(matchingColl.id);
      }

      const isLocked = !cat.isCaught && !matchingColl;
      const displayImage = resolvePhotoUrl(
        matchingColl?.photoUrl || cat.userPhotoUrl || cat.defaultImageUrl
      );

      return {
        id: matchingColl?.id || cat.id || `animal_${index}`,
        name: matchingColl?.name || cat.name,
        species: cat.name,
        category: cat.category,
        imageUri: isLocked ? null : displayImage,
        story: matchingColl?.story || cat.defaultStory || '',
        favFood: matchingColl?.favFood || cat.defaultFavFood || '',
        temperament: matchingColl?.temperament || cat.defaultTemperament || '',
        isFavorite: Boolean(matchingColl?.isFavorite || cat.isFavorite),
        isLocked,
        caughtAt: matchingColl?.caughtAt,
      };
    });

    // 2. Custom discoveries: Collections not tied to the 18 catalog species
    const customCards: AnimalItem[] = collections
      .filter((c) => !matchedCollIds.has(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        species: c.animalSpecies || c.name,
        category: c.category || 'Discovered',
        imageUri: resolvePhotoUrl(c.photoUrl),
        story: c.story || '',
        favFood: c.favFood || '',
        temperament: c.temperament || '',
        isFavorite: Boolean(c.isFavorite),
        isLocked: false,
        caughtAt: c.caughtAt,
      }));

    return [...catalogCards, ...customCards];
  },

  getAnimalById: (id: string) => {
    const grid = get().getGalleryGrid();
    const cleanId = (id || '').trim().toLowerCase();
    return grid.find(
      (a) =>
        a.id.toLowerCase() === cleanId ||
        a.species.toLowerCase() === cleanId ||
        a.name.toLowerCase() === cleanId
    );
  },
}));
