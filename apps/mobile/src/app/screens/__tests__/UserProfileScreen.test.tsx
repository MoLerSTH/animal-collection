import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react-native';
import UserProfileScreen from '../UserProfileScreen';
import { useCollectionStore } from '../../../features/collections/stores/useCollectionStore';
import type { UserCollectionItem } from '../../../features/collections/types';

const navigate = jest.fn();
const card = (id: string, species: string): UserCollectionItem => ({
  id, userId: 'u1', animalSpecies: species, identifiedSpecies: species, category: 'Wild', name: species,
  photoUrl: `file:///${id}.jpg`, story: '', favFood: '', temperament: '', isFavorite: false, source: 'capture', animalType: 'Mammal',
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({navigate});
  useCollectionStore.setState({catalog: [], collections: [card('hippo', 'Hippopotamus')]});
});
afterEach(() => jest.restoreAllMocks());
it('opens a locked badge with completed and unfinished missions, and dismisses it', () => {
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: 'Rare Finder, Locked, 1/2. View missions'}));
  expect(screen.getByText('รายการภารกิจ')).toBeTruthy();
  expect(screen.getByLabelText('Completed: Mammal · Hippopotamus')).toBeTruthy();
  expect(screen.getByLabelText('Pending: ประเภทที่ 2')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Dismiss badge details'));
  expect(screen.queryByText('รายการภารกิจ')).toBeNull();
});
it('opens a completed card from the mission checklist', () => {
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: /Rare Finder, Locked/}));
  fireEvent.press(screen.getByLabelText('Completed: Mammal · Hippopotamus'));
  expect(navigate).toHaveBeenCalledWith('AnimalDetail', {animalId: 'hippo'});
});
it('navigates to Catch from an unfinished mission', () => {
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: /Explorer, Locked/}));
  fireEvent.press(screen.getByRole('button', {name: 'ไปถ่ายสัตว์เพิ่ม'}));
  expect(navigate).toHaveBeenCalledWith('MainTabs', {screen: 'Catch'});
});
it('updates progress and badge colors immediately when an existing card is corrected', () => {
  const birds = ['Owl', 'Parrot', 'Eagle'].map((name, i) => ({...card(`${i}`, name), animalType: 'Bird' as const}));
  useCollectionStore.setState({collections: birds.slice(0, 1)});
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: /Bird Watcher, Locked, 1\/2/}));
  act(() => useCollectionStore.setState({collections: birds}));
  expect(screen.getByText('Unlocked · สำเร็จแล้ว!')).toBeTruthy();
  expect(screen.getAllByLabelText('Bird Watcher badge, unlocked')).toHaveLength(2);
  expect(screen.queryByRole('button', {name: 'ไปถ่ายสัตว์เพิ่ม'})).toBeNull();
});

it('directs Zoo Lover to Gallery to favorite animals', () => {
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: /Zoo Lover, Locked, 0\/2/}));
  expect(screen.getByText('เพิ่มสัตว์ที่ถ่ายเอง 2 ชนิดลงในรายการโปรด')).toBeTruthy();
  expect(screen.getByText('เหลืออีก 2 ชนิด เพื่อปลดล็อกเหรียญสี', {exact: false})).toBeTruthy();
  fireEvent.press(screen.getByRole('button', {name: 'เลือกรายการโปรดใน Gallery'}));
  expect(navigate).toHaveBeenCalledWith('MainTabs', {screen: 'Gallery'});
});
it('updates Zoo Lover immediately when favorite flags change', () => {
  const pets = [card('cat', 'Cat'), card('dog', 'Dog')];
  useCollectionStore.setState({collections: pets});
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: /Zoo Lover, Locked, 0\/2/}));
  act(() => useCollectionStore.setState({collections: pets.map(item => ({...item, isFavorite: true}))}));
  expect(screen.getByText('Unlocked · สำเร็จแล้ว!')).toBeTruthy();
  expect(screen.getAllByLabelText('Zoo Lover badge, unlocked')).toHaveLength(2);
});
