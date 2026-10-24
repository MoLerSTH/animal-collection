import { useCollectionStore } from '../useCollectionStore';
import { appStorage } from '../../../../core/storage/mmkv';

describe('useCollectionStore', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    appStorage.clearAll();
    useCollectionStore.setState({
      catalog: [
        {
          id: 'cat_01',
          code: 'hippopotamus',
          name: 'Hippopotamus',
          category: 'Zoo',
          catalogOrder: 1,
          isCaught: false,
          caughtCount: 0,
          isFavorite: false,
        },
        {
          id: 'cat_02',
          code: 'badger',
          name: 'Badger',
          category: 'Wild',
          catalogOrder: 2,
          isCaught: false,
          caughtCount: 0,
          isFavorite: false,
        },
      ],
      collections: [],
      summary: {
        caughtCount: 0,
        totalCatalog: 2,
        favoritesCount: 0,
      },
      isLoading: false,
      isSubmitting: false,
    });
  });

  it('renders catalog grid with locked animals by default', () => {
    const grid = useCollectionStore.getState().getGalleryGrid();
    expect(grid).toHaveLength(2);
    expect(grid[0].isLocked).toBe(true);
    expect(grid[0].species).toBe('Hippopotamus');
  });

  it('adds a new collection and unlocks the animal in catalog grid', async () => {
    const created = await useCollectionStore.getState().addCollection({
      photoUri: 'file:///tmp/caught_hippo.jpg',
      name: 'Moodeng',
      animalId: 'cat_01',
      story: 'Bouncy baby hippo',
      favFood: 'Cabbage',
      temperament: 'Playful',
      isFavorite: true,
    });

    expect(created.name).toBe('Moodeng');
    expect(created.photoUrl).toMatch(/^file:\/\/\/documents\/captures\/.+\.jpg$/);
    expect(created.syncStatus).toBe('pending');

    const state = useCollectionStore.getState();
    expect(state.collections).toHaveLength(1);
    expect(state.summary.caughtCount).toBe(1);

    // Verify grid now has unlocked Hippopotamus
    const grid = state.getGalleryGrid();
    const hippo = grid.find((a) => a.species === 'Hippopotamus');
    expect(hippo).toBeDefined();
    expect(hippo?.isLocked).toBe(false);
    expect(hippo?.name).toBe('Moodeng');
    expect(hippo?.isFavorite).toBe(true);
  });

  it('toggles favorite flag for collected animal', async () => {
    await useCollectionStore.getState().addCollection({
      photoUri: 'file:///tmp/badger.jpg',
      name: 'Badger',
      animalId: 'cat_02',
      isFavorite: false,
    });

    const collId = useCollectionStore.getState().collections[0].id;
    expect(useCollectionStore.getState().collections[0].isFavorite).toBe(false);

    await useCollectionStore.getState().toggleFavorite(collId);
    expect(useCollectionStore.getState().collections[0].isFavorite).toBe(true);

    await useCollectionStore.getState().toggleFavorite(collId);
    expect(useCollectionStore.getState().collections[0].isFavorite).toBe(false);
  });

  it('displays custom discovered animals in the gallery grid', async () => {
    // Add custom discovery not in catalog
    await useCollectionStore.getState().addCollection({
      photoUri: 'file:///tmp/custom_bright.jpg',
      name: 'Bright',
      story: 'A friendly neighborhood dog',
    });

    const state = useCollectionStore.getState();
    expect(state.collections).toHaveLength(1);

    const grid = state.getGalleryGrid();
    // 2 catalog animals + 1 custom animal = 3 total cards
    expect(grid).toHaveLength(3);
    const customAnimal = grid.find((a) => a.name === 'Bright');
    expect(customAnimal).toBeDefined();
    expect(customAnimal?.isLocked).toBe(false);
    expect(customAnimal?.category).toBe('Wild');
  });

  it('does not unlock an unrelated catalog entry from a partial nickname', async () => {
    await useCollectionStore.getState().addCollection({
      photoUri: 'file:///tmp/hippo_partial.jpg',
      name: 'Hippopota',
    });

    const state = useCollectionStore.getState();
    const grid = state.getGalleryGrid();
    const hippo = grid.find((a) => a.species === 'Hippopotamus');
    expect(hippo).toBeDefined();
    expect(hippo?.isLocked).toBe(true);
  });
});

it('persists corrected local classification without leaving a ghost catalog card', async () => {
  const { useAuthStore } = require('../../../auth/stores/useAuthStore');
  const userId = useAuthStore.getState().user?.id || 'local_user';
  appStorage.clearAll();
  useCollectionStore.setState({ownerId: userId, catalog: [{
    id: 'hippo-id', code: 'hippopotamus', name: 'Hippopotamus', category: 'Zoo', catalogOrder: 1,
    isCaught: true, caughtCount: 1, isFavorite: false, userPhotoUrl: 'file:///fish.jpg',
  }], collections: [{
    id: 'local_coll_fish', userId, animalId: 'hippo-id', animalSpecies: 'Hippopotamus', identifiedSpecies: 'Hippopotamus',
    name: 'ปลาอ้วนๆ', category: 'Zoo', photoUrl: 'file:///fish.jpg', story: '', favFood: '', temperament: '', isFavorite: false,
    source: 'capture', animalType: 'Mammal', habitatTags: [],
  }]});
  await useCollectionStore.getState().updateIdentification('local_coll_fish', {identifiedSpecies: 'Goldfish', animalType: 'Fish', habitatTags: ['aquatic']});
  const state = useCollectionStore.getState();
  expect(state.collections[0]).toMatchObject({name: 'ปลาอ้วนๆ', identifiedSpecies: 'Goldfish', animalType: 'Fish', source: 'capture'});
  const discovered = state.getGalleryGrid().filter(item => !item.isLocked);
  expect(discovered).toHaveLength(1);
  expect(discovered[0]).toMatchObject({species: 'Goldfish', animalType: 'Fish', habitatTags: ['aquatic']});
  useCollectionStore.setState({collections: []});
  useCollectionStore.getState().hydrateForUser(userId);
  expect(useCollectionStore.getState().collections[0].identifiedSpecies).toBe('Goldfish');
});
