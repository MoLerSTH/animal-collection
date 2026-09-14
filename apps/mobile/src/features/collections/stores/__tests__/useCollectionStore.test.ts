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
    expect(created.photoUrl).toBe('file:///tmp/caught_hippo.jpg');

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
});
