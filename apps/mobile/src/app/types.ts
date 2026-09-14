export interface AnimalItem {
  id: string;
  name: string;
  species: string;
  category: 'Zoo' | 'Wild' | string;
  imageUri: string | null;
  story: string;
  favFood: string;
  temperament: string;
  isFavorite: boolean;
  isLocked: boolean;
  caughtAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUri?: string;
  stats: {
    caught: number;
    total: number;
    favorites: number;
    followers: number;
    following: number;
  };
  language: string;
  notificationsEnabled: boolean;
}

