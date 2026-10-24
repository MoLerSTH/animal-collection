import { appStorage, StorageKeys } from '../../../core/storage/mmkv';
import { CatalogAnimal, UserCollectionItem } from '../types';
import { giftClaimedKey, isLocalStarterGift, LOCAL_STARTER_GIFT_ID, markStarterGiftClaimed, reconcileStarterGifts } from './starterGift';

export interface CollectionCache { catalog: CatalogAnimal[]; collections: UserCollectionItem[] }
const keyFor = (userId: string) => `collection_snapshot:${encodeURIComponent(userId)}`;

export const uncollectedCatalog = (catalog: CatalogAnimal[]) => catalog.map(animal => ({
  ...animal, isCaught: false, caughtCount: 0, userPhotoUrl: null, isFavorite: false,
}));

export function readCollectionCache(userId: string, fallback: CatalogAnimal[]): CollectionCache {
  if (appStorage.getString(`deleted_account:${userId}`)) return {catalog: uncollectedCatalog(fallback), collections: []};
  try {
    const value = appStorage.getString(keyFor(userId));
    if (value) {
      const parsed: CollectionCache = JSON.parse(value);
      if (Array.isArray(parsed.catalog) && Array.isArray(parsed.collections)) {
        return { catalog: parsed.catalog, collections: reconcileStarterGifts(userId, parsed.collections.filter(item => item.userId === userId)) };
      }
    }
    // Migrate earlier shared caches by record owner, never by the last displayed profile.
    const legacy = JSON.parse(appStorage.getString(StorageKeys.COLLECTIONS_DATA) || '[]') as UserCollectionItem[];
    const catalog = JSON.parse(appStorage.getString(StorageKeys.CATALOG_DATA) || 'null') as CatalogAnimal[] | null;
    return {
      catalog: uncollectedCatalog(Array.isArray(catalog) ? catalog : fallback),
      collections: reconcileStarterGifts(userId, Array.isArray(legacy) ? legacy.filter(item => item.userId === userId) : []),
    };
  } catch {
    return { catalog: uncollectedCatalog(fallback), collections: [] };
  }
}

export function writeCollectionCache(userId: string, snapshot: CollectionCache) {
  if (appStorage.getString(`deleted_account:${userId}`)) return;
  appStorage.set(keyFor(userId), JSON.stringify({
    catalog: snapshot.catalog, collections: reconcileStarterGifts(userId, snapshot.collections.filter(item => item.userId === userId)),
  }));
}

/** The first explicit login can keep the gift/captures collected anonymously on this device. */
export function claimGuestCollections(userId: string, fallback: CatalogAnimal[]) {
  if (appStorage.getString('guest_collection_owner')) return;
  const guest = readCollectionCache('local_user', fallback);
  if (!guest.collections.length) return;
  const own = readCollectionCache(userId, fallback);
  const giftOwner = appStorage.getString('starterGiftOwner');
  const collections = [...new Map([
    ...own.collections, ...guest.collections
      .filter(item => !isLocalStarterGift(item) || !giftOwner || giftOwner === 'local_user' || giftOwner === userId)
      .map(item => ({ ...item, userId,
      id: appStorage.getString('starterGiftClaimed') === 'true' &&
        isLocalStarterGift(item)
        ? LOCAL_STARTER_GIFT_ID : item.id,
    })),
  ].map(item => [item.id, item])).values()];
  if (collections.some(isLocalStarterGift)) {
    markStarterGiftClaimed(userId);
    // Bind the legacy guest receipt too, so later logins cannot migrate it again.
    if (!giftOwner || giftOwner === 'local_user') appStorage.set('starterGiftOwner', userId);
  }
  writeCollectionCache(userId, { catalog: own.catalog, collections });
  appStorage.set('guest_collection_owner', userId);
  appStorage.delete(giftClaimedKey('local_user'));
}
