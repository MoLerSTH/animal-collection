import { appStorage } from '../../../../core/storage/mmkv';
import { CatalogAnimal } from '../../types';
import { giftClaimedKey, giftServerKey, markStarterGiftClaimed, restoreStarterGift } from '../starterGift';
const hippo: CatalogAnimal = { id: 'hippo', code: 'hippopotamus', name: 'Hippopotamus', category: 'Zoo', catalogOrder: 1, isCaught: false, caughtCount: 0, isFavorite: false };
beforeEach(() => appStorage.clearAll());

it('restores a claimed gift even if the legacy card cache has been lost', () => {
  appStorage.set('starterGiftClaimed', 'true');
  const restored = restoreStarterGift('a', [hippo], []);
  expect(restored).toHaveLength(1);
  expect(restored[0]).toMatchObject({ userId: 'a', animalCode: 'hippopotamus' });
  expect(restoreStarterGift('a', [hippo], restored)).toHaveLength(1);
});

it('does not issue a gift to someone who skipped claiming it', () => {
  expect(restoreStarterGift('a', [hippo], [])).toEqual([]);
});

it('does not transfer the same device receipt to a different account', () => {
  appStorage.set('starterGiftClaimed', 'true');
  restoreStarterGift('a', [hippo], []);
  expect(restoreStarterGift('b', [hippo], [])).toEqual([]);
});

it('does not add a local duplicate after the gift is saved to the backend', () => {
  appStorage.set('starterGiftClaimed', 'true');
  appStorage.set(giftServerKey('a'), 'server-gift');
  expect(restoreStarterGift('a', [hippo], [])).toEqual([]);
});

it('lets a second account explicitly claim its own gift without borrowing the first receipt', () => {
  appStorage.set('starterGiftClaimed', 'true');
  appStorage.set('starterGiftOwner', 'a');
  expect(restoreStarterGift('b', [hippo], [])).toEqual([]);
  markStarterGiftClaimed('b');
  const gift = restoreStarterGift('b', [hippo], []);
  expect(gift).toHaveLength(1);
  expect(gift[0].userId).toBe('b');
  expect(appStorage.getString(giftClaimedKey('b'))).toBe('true');
  expect(appStorage.getString('starterGiftOwner')).toBe('a');
  expect(restoreStarterGift('b', [hippo], gift)).toHaveLength(1);
});
