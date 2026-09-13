import { mockAnimals, CATALOG_SIZE } from '../mockAnimals';

describe('mockAnimals', () => {
  it('has a matching CATALOG_SIZE constant', () => {
    expect(CATALOG_SIZE).toBe(mockAnimals.length);
  });

  it('has unique ids for every entry', () => {
    const ids = mockAnimals.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never has a locked entry with a name/species already set', () => {
    const locked = mockAnimals.filter((a) => a.isLocked);
    expect(locked.length).toBeGreaterThan(0);
    locked.forEach((a) => {
      expect(a.species).toBe('Unknown');
      expect(a.imageUri).toBeNull();
    });
  });

  it('has at least one caught, non-locked animal to seed the Gallery', () => {
    const caught = mockAnimals.filter((a) => !a.isLocked);
    expect(caught.length).toBeGreaterThan(0);
  });
});
