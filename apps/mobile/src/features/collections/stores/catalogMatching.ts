import { CatalogAnimal, UserCollectionItem } from '../types';

const normalized = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

/** Stable identity/identification wins over a display name. Never fuzzy-match nicknames. */
export function catalogForCollection(item: UserCollectionItem, catalog: CatalogAnimal[]) {
  const linked = catalog.find(animal => animal.id === item.animalId || animal.code === item.animalCode);
  if (linked) return linked;
  const species = normalized(item.identifiedSpecies || item.animalSpecies || item.name);
  return catalog.find(animal => normalized(animal.name) === species || normalized(animal.code) === species);
}

/** Keep a single view of a retried capture, preferring its confirmed server record. */
export function uniqueCollections(collections: UserCollectionItem[]) {
  const records = new Map<string, UserCollectionItem>();
  for (const item of collections) {
    const id = item.clientRequestId || item.id.replace(/^local_coll_(?=[0-9a-f]{8}-)/i, '');
    const key = `${item.userId}:${id}`;
    const previous = records.get(key);
    if (!previous || previous.id.startsWith('local_coll_') && !item.id.startsWith('local_coll_')) records.set(key, item);
  }
  return [...records.values()];
}
