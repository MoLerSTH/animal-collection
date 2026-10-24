import { achievements } from '../achievements';
import type { UserCollectionItem } from '../../../features/collections/types';

const capture = (id: string, species: string, extra: Partial<UserCollectionItem> = {}): UserCollectionItem => ({
  id, userId: 'user-1', animalSpecies: species, identifiedSpecies: species, category: 'Wild', name: species,
  photoUrl: `file:///${id}.jpg`, story: '', favFood: '', temperament: '', isFavorite: false,
  source: 'capture', animalType: 'Unknown', habitatTags: [], capturedAt: '2026-10-23T04:00:00Z', ...extra,
});
const getBadge = (items: UserCollectionItem[], name: string) => achievements(items).find(b => b.name === name)!;

it('starts all nine missions locked with pending requirements', () => {
  const badges = achievements([]);
  expect(badges).toHaveLength(9);
  expect(badges.every(b => !b.unlocked && b.value === 0 && b.remaining === b.total)).toBe(true);
  expect(badges.every(b => b.missions.every(m => !m.done))).toBe(true);
});
it('counts gifts for Explorer but never for camera missions, even with matching time/type/location', () => {
  const gift = capture('gift', 'Hippopotamus', {source: 'starter_gift', animalType: 'Mammal', habitatTags: ['aquatic'], latitude: 18.81, longitude: 98.948, capturedAt: '2026-10-23T13:00:00Z'});
  const badges = achievements([gift]);
  expect(badges[0].value).toBe(1);
  expect(badges.slice(1).every(b => b.value === 0)).toBe(true);
});
it('requires five different identifications for Explorer while Photo Pro accepts repeat animals', () => {
  const photos = Array.from({length: 5}, (_, i) => capture(`cat-${i}`, 'Cat', {name: `Nickname ${i}`}));
  expect(getBadge(photos, 'Explorer').value).toBe(1);
  expect(getBadge(photos, 'Photo Pro').unlocked).toBe(true);
  expect(getBadge(photos, 'Photo Pro').missions.every(m => m.done)).toBe(true);
});
it('deduplicates the same photo, including absolute/relative server URLs', () => {
  const photos = [capture('a', 'Cat', {photoUrl: '/api/v1/storage/photos/user_a.jpg'}), capture('b', 'Cat', {photoUrl: 'http://localhost:8000/api/v1/storage/photos/user_a.jpg'})];
  expect(getBadge(photos, 'Photo Pro').value).toBe(1);
});
it('unlocks a badge independently when its own target is reached', () => {
  const birds = ['Owl', 'Parrot', 'Eagle'].map((species, i) => capture(`${i}`, species, {animalType: 'Bird'}));
  expect(getBadge(birds, 'Bird Watcher')).toMatchObject({value: 2, total: 2, unlocked: true, remaining: 0});
  expect(getBadge(birds, 'Explorer').unlocked).toBe(false);
});
it('uses persisted classification even when display names are in Thai', () => {
  const fish = capture('fish', 'Goldfish', {name: 'ปลาอ้วนๆ', animalType: 'Fish'});
  expect(getBadge([fish], 'Aquatic Friend').value).toBe(1);
  expect(getBadge([{...fish, name: 'ชื่อใหม่'}], 'Aquatic Friend').value).toBe(1);
});
it('does not infer type from a nickname or count legacy cards as camera captures', () => {
  expect(getBadge([capture('a', 'Cat', {name: 'Bird Fish Safari Mountain'})], 'Bird Watcher').value).toBe(0);
  expect(getBadge([capture('b', 'Goldfish', {animalType: 'Fish', source: 'legacy'})], 'Aquatic Friend').value).toBe(0);
});
it('counts different aquatic species, including pets, while repeated species count once', () => {
  const fish = [capture('a', 'Goldfish', {animalType: 'Fish'}), capture('b', 'Goldfish', {animalType: 'Fish'})];
  expect(getBadge(fish, 'Aquatic Friend').value).toBe(1);
  expect(getBadge([...fish, capture('c', 'Guppy', {animalType: 'Fish'})], 'Aquatic Friend').unlocked).toBe(true);
  expect(getBadge([capture('d', 'Otter', {habitatTags: ['aquatic']})], 'Aquatic Friend').value).toBe(1);
});
it('unlocks Zoo Lover by favoriting two captured species without coordinates or a zoo category', () => {
  const pets = [capture('cat', 'Cat', {category: 'Domestic', isFavorite: true}), capture('dog', 'Dog', {isFavorite: true})];
  expect(getBadge(pets, 'Zoo Lover')).toMatchObject({value: 2, total: 2, unlocked: true});
  expect(getBadge([...pets, capture('cat2', 'Cat', {isFavorite: true})], 'Zoo Lover').missions).toHaveLength(2);
  expect(getBadge([pets[0], {...pets[1], isFavorite: false}], 'Zoo Lover').value).toBe(1);
});
it('does not unlock Zoo Lover just because a photo was taken at Chiang Mai Zoo', () => {
  expect(getBadge([capture('a', 'Elephant', {category: 'Zoo', latitude: 18.81, longitude: 98.948})], 'Zoo Lover').value).toBe(0);
});
it('unlocks Safari Master with ordinary mammals, without safari tags or coordinates', () => {
  const pets = ['Cat', 'Dog', 'Rabbit'].map((species, i) => capture(`${i}`, species, {animalType: 'Mammal', category: 'Domestic'}));
  expect(getBadge(pets, 'Safari Master')).toMatchObject({value: 3, total: 3, unlocked: true});
  expect(getBadge([pets[0], capture('cat2', 'Cat', {animalType: 'Mammal'}), capture('fish', 'Goldfish', {animalType: 'Fish'})], 'Safari Master').value).toBe(1);
});
it('counts three different Thailand dates for Mountain Climber, even with the same animal', () => {
  const photos = [
    capture('a', 'Cat', {capturedAt: '2026-10-23T16:59:00Z'}),
    capture('b', 'Cat', {capturedAt: '2026-10-23T17:00:00Z'}),
    capture('c', 'Cat', {capturedAt: '2026-10-24T17:00:00Z'}),
  ];
  const badge = getBadge(photos, 'Mountain Climber');
  expect(badge).toMatchObject({value: 3, total: 3, unlocked: true, unit: 'วัน'});
  expect(badge.missions.map(m => m.label)).toEqual(['2026-10-23 · Cat', '2026-10-24 · Cat', '2026-10-25 · Cat']);
});
it('does not count repeated days, invalid dates, or gifts for Mountain Climber', () => {
  const photos = [
    capture('a', 'Cat'), capture('b', 'Dog'), capture('c', 'Bird', {capturedAt: 'invalid'}),
    capture('d', 'Cat', {source: 'starter_gift', capturedAt: '2026-10-24T04:00:00Z'}),
    capture('e', 'Fish', {capturedAt: null, caughtAt: '2026-10-25T04:00:00'}),
  ];
  expect(getBadge(photos, 'Mountain Climber')).toMatchObject({value: 2, unlocked: false, remaining: 1});
  expect(getBadge([capture('a', 'Ibex', {habitatTags: ['mountain'], capturedAt: null, caughtAt: undefined})], 'Mountain Climber').value).toBe(0);
});
it.each([
  ['2026-10-23T10:59:00Z', false], ['2026-10-23T11:00:00Z', true],
  ['2026-10-23T22:59:00Z', true], ['2026-10-23T23:00:00Z', false],
  ['2026-10-23T13:00:00', true], ['invalid', false],
])('counts the Thailand night boundary %s correctly', (capturedAt, expected) => {
  expect(getBadge([capture('a', 'Cat', {capturedAt})], 'Night Owl').value).toBe(expected ? 1 : 0);
});
it('uses the shutter timestamp rather than the later save time', () => {
  expect(getBadge([capture('a', 'Cat', {capturedAt: '2026-10-23T10:59:00Z', caughtAt: '2026-10-23T11:01:00Z'})], 'Night Owl').value).toBe(0);
});
it('unlocks Rare Finder with any two known animal types instead of specific rare species', () => {
  const photos = [capture('a', 'Cat', {animalType: 'Mammal'}), capture('b', 'Goldfish', {animalType: 'Fish'})];
  const badge = getBadge(photos, 'Rare Finder');
  expect(badge).toMatchObject({value: 2, total: 2, unlocked: true, unit: 'ประเภท'});
  expect(badge.missions).toEqual([
    expect.objectContaining({label: 'Mammal · Cat', done: true, collectionId: 'a'}),
    expect.objectContaining({label: 'Fish · Goldfish', done: true, collectionId: 'b'}),
  ]);
});
it('does not mistake different mammals or Unknown classifications for different types', () => {
  const photos = [capture('a', 'Cat', {animalType: 'Mammal'}), capture('b', 'Dog', {animalType: 'Mammal'}), capture('c', 'Fish')];
  const badge = getBadge(photos, 'Rare Finder');
  expect(badge.value).toBe(1);
  expect(badge.missions).toEqual([
    expect.objectContaining({label: expect.stringContaining('Mammal · '), done: true}),
    expect.objectContaining({label: 'ประเภทที่ 2', done: false}),
  ]);
});
it('supports accessible bird and insect identifications for Rare Finder', () => {
  const photos = [capture('bird', 'Sparrow', {animalType: 'Bird'}), capture('ant', 'Ant', {animalType: 'Insect'})];
  expect(getBadge(photos, 'Rare Finder').unlocked).toBe(true);
});
it('unlocks Night Owl after just one captured night photo', () => {
  expect(getBadge([capture('cat', 'Cat', {capturedAt: '2026-10-23T13:00:00Z'})], 'Night Owl')).toMatchObject({value: 1, total: 1, unlocked: true});
});
