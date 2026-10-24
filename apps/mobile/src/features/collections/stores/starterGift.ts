import { appStorage } from '../../../core/storage/mmkv';
import { CatalogAnimal, UserCollectionItem } from '../types';

export const LOCAL_STARTER_GIFT_ID = 'local_coll_starter_gift';
export const giftServerKey = (userId: string) => `starter_gift_server_id:${userId}`;
export const giftRemovedKey = (userId: string) => `starter_gift_removed:${userId}`;
export const giftClaimedKey = (userId: string) => `starter_gift_claimed:${userId}`;

/** Claim intent belongs to an account; the old device receipt is migrated only to its owner. */
export function markStarterGiftClaimed(userId: string) {
  appStorage.set(giftClaimedKey(userId), 'true');
  if (userId === 'local_user') {
    appStorage.set('starterGiftClaimed', 'true');
    appStorage.set('starterGiftOwner', 'local_user');
  }
}

export function isLocalStarterGift(item: UserCollectionItem) {
  if (item.source === 'capture') return false;
  return item.id === LOCAL_STARTER_GIFT_ID || item.id === 'local_coll_gift' ||
    (item.source === 'starter_gift' && item.id.startsWith('local_coll_'));
}

/** A confirmed server gift replaces its local placeholder, including older caches. */
export function reconcileStarterGifts(userId: string, collections: UserCollectionItem[]) {
  const serverId = appStorage.getString(giftServerKey(userId));
  const isGift = (item: UserCollectionItem) => item.userId === userId &&
    (isLocalStarterGift(item) || item.source === 'starter_gift' || item.id === serverId);
  if (appStorage.getString(giftRemovedKey(userId))) return collections.filter(item => !isGift(item));
  const serverGift = userId === 'local_user' ? undefined :
    collections.find(item => item.userId === userId && item.id === serverId) ||
    collections.find(item => item.userId === userId && item.source === 'starter_gift' && !isLocalStarterGift(item));
  if (serverGift) {
    appStorage.set(giftServerKey(userId), serverGift.id);
    return collections.filter(item => !isGift(item) || item === serverGift);
  }
  if (serverId) return collections.filter(item => !isLocalStarterGift(item));
  const localGift = collections.find(item => item.userId === userId && isLocalStarterGift(item));
  return collections.filter(item => !isLocalStarterGift(item) || item === localGift);
}

export function hasPendingStarterGift(userId: string) {
  const owner = appStorage.getString('starterGiftOwner');
  if (!appStorage.getString(giftClaimedKey(userId)) && appStorage.getString('starterGiftClaimed') === 'true' && (!owner || owner === userId)) {
    appStorage.set(giftClaimedKey(userId), 'true');
    appStorage.set('starterGiftOwner', userId);
  }
  return appStorage.getString(giftClaimedKey(userId)) === 'true' &&
    !appStorage.getString(giftServerKey(userId)) && !appStorage.getString(giftRemovedKey(userId));
}

/** Recover a legacy claim receipt even when its old local card/cache no longer exists. */
export function restoreStarterGift(userId: string, catalog: CatalogAnimal[], collections: UserCollectionItem[]) {
  collections = reconcileStarterGifts(userId, collections);
  if (!hasPendingStarterGift(userId)) return collections;
  const hippo = catalog.find(animal => animal.code === 'hippopotamus');
  if (!hippo) return collections;
  if (collections.some(isLocalStarterGift)) return collections;
  const gift: UserCollectionItem = {
    id: LOCAL_STARTER_GIFT_ID, userId, animalId: hippo.id, animalCode: hippo.code,
    animalSpecies: hippo.name, name: hippo.name, category: hippo.category,
    photoUrl: hippo.defaultImageUrl || '', story: hippo.defaultStory || '',
    favFood: hippo.defaultFavFood || '', temperament: hippo.defaultTemperament || '',
    source: 'starter_gift', identifiedSpecies: hippo.name, animalType: 'Mammal', habitatTags: ['aquatic'],
    isFavorite: false, caughtAt: new Date().toISOString(),
  };
  return [...collections, gift];
}
