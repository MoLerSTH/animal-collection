import { AnimalItem } from '../types';

/**
 * Preset catalog of animals the user can discover/"catch".
 * `isLocked: true` animals show as gray placeholder boxes in the Gallery
 * until the user catches one matching that species.
 */
export const mockAnimals: AnimalItem[] = [
  {
    id: 'a1',
    name: 'Moodeng',
    species: 'Hippopotamus',
    category: 'Zoo',
    imageUri: 'https://static.bangkokpost.com/media/content/20240913/c1_2865088.jpg',
    story: 'I found Moodeng in Chiangmai zoo. Lovely Hippo. Really made my day.',
    favFood: 'Golden Berries',
    temperament: 'Extremely Shy',
    isFavorite: true,
    isLocked: false,
    caughtAt: '2026-08-12T09:41:00.000Z',
  },
  {
    id: 'a2',
    name: 'Badger',
    species: 'Badger',
    category: 'Wild',
    imageUri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgbbRRTiYg6KK7sD6fI1Ck_LpO3-Gl2N9iF1u5WHi--w&s=100',
    story: '',
    favFood: 'Earthworms',
    temperament: 'Curious',
    isFavorite: false,
    isLocked: false,
    caughtAt: '2026-08-10T09:41:00.000Z',
  },
  {
    id: 'a3',
    name: 'Red Fox',
    species: 'Red Fox',
    category: 'Wild',
    imageUri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4Waym_Io1FYyuWSay7-apZROFHcXslt88d2BbpViTrSbOjQXn9ztRNDBw&s=10',
    story: '',
    favFood: 'Berries & Small Prey',
    temperament: 'Playful',
    isFavorite: false,
    isLocked: false,
    caughtAt: '2026-08-08T09:41:00.000Z',
  },
  {
    id: 'a4',
    name: 'Monkey',
    species: 'Monkey',
    category: 'Wild',
    imageUri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkrBi-HRf2jqsISYHfow-RM0rH7jLZgZFDeuIrIqFKMwcKCEi9meLr7PRS&s=10',
    story: '',
    favFood: 'Bananas',
    temperament: 'Mischievous',
    isFavorite: false,
    isLocked: false,
    caughtAt: '2026-08-01T09:41:00.000Z',
  },
  // Remaining slots are locked / not yet caught
  ...Array.from({ length: 14 }).map((_, i) => ({
    id: `locked-${i}`,
    name: 'Unknown',
    species: 'Unknown',
    category: 'Wild' as const,
    imageUri: null,
    story: '',
    favFood: '',
    temperament: '',
    isFavorite: false,
    isLocked: true,
  })),
];

export const CATALOG_SIZE = mockAnimals.length;
