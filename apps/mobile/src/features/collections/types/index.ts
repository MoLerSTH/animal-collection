export interface CatalogAnimal {
  id: string;
  code: string;
  name: string;
  scientificName?: string;
  category: 'Zoo' | 'Wild' | 'Marine' | 'Polar' | 'Desert' | 'Domestic' | string;
  defaultImageUrl?: string;
  defaultStory?: string;
  defaultFavFood?: string;
  defaultTemperament?: string;
  catalogOrder: number;
  isCaught: boolean;
  userPhotoUrl?: string | null;
  caughtCount: number;
  isFavorite: boolean;
}

export interface UserCollectionItem {
  id: string;
  userId: string;
  animalId?: string | null;
  animalCode?: string | null;
  animalSpecies: string;
  category: string;
  name: string;
  photoUrl: string;
  story: string;
  favFood: string;
  temperament: string;
  isFavorite: boolean;
  latitude?: number | null;
  longitude?: number | null;
  caughtAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CollectionSummary {
  caughtCount: number;
  totalCatalog: number;
  favoritesCount: number;
}

export interface CreateCollectionPayload {
  animalId?: string;
  name: string;
  photoUrl: string;
  story?: string;
  favFood?: string;
  temperament?: string;
  isFavorite?: boolean;
  latitude?: number;
  longitude?: number;
}

