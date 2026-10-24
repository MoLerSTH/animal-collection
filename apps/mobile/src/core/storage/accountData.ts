import { File } from 'expo-file-system';
import { appStorage, StorageKeys } from './mmkv';

/** Purge one account after the backend confirms deletion; leave other accounts intact. */
export function removeLocalAccountData(userId: string) {
  const key = `collection_snapshot:${encodeURIComponent(userId)}`;
  const photos = new Set<string>();
  let legacy: any[] = [];
  try {
    const snapshot = JSON.parse(appStorage.getString(key) || '{}');
    for (const item of snapshot.collections || []) if (item.userId === userId) { if (item.photoUrl?.startsWith('file://')) photos.add(item.photoUrl); if (item.localPhotoUri?.startsWith('file://')) photos.add(item.localPhotoUri); }
  } catch { /* Malformed caches should still be removed. */ }
  try {
    legacy = JSON.parse(appStorage.getString(StorageKeys.COLLECTIONS_DATA) || '[]');
    if (!Array.isArray(legacy)) legacy = [];
    for (const item of legacy) if (item.userId === userId) { if (item.photoUrl?.startsWith('file://')) photos.add(item.photoUrl); if (item.localPhotoUri?.startsWith('file://')) photos.add(item.localPhotoUri); }
    appStorage.set(StorageKeys.COLLECTIONS_DATA, JSON.stringify(legacy.filter(item => item.userId !== userId)));
  } catch { appStorage.delete(StorageKeys.COLLECTIONS_DATA); }
  appStorage.set(`deleted_account:${userId}`, 'true');
  appStorage.delete(key);
  appStorage.delete(`analysisConsent:${userId}`);
  appStorage.delete(`starter_gift_server_id:${userId}`);
  appStorage.delete(`starter_gift_removed:${userId}`);
  appStorage.delete(`starter_gift_claimed:${userId}`);
  appStorage.delete(StorageKeys.CATALOG_DATA); // Earlier shared catalog caches contained account photo references.
  if (appStorage.getString('guest_collection_owner') === userId) {
    appStorage.delete('guest_collection_owner');
    appStorage.delete('collection_snapshot:local_user');
  }
  if (appStorage.getString('starterGiftOwner') === userId) {
    appStorage.delete('starterGiftOwner');
    appStorage.delete('starterGiftClaimed');
  }
  for (const uri of photos) {
    try { const photo = new File(uri); if (photo.exists) photo.delete(); }
    catch { console.warn('Could not remove a temporary account photo.'); }
  }
}
