import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react-native';
import UserProfileScreen from '../UserProfileScreen';
import { useCollectionStore } from '../../../features/collections/stores/useCollectionStore';
import { useLanguageStore } from '../../../core/i18n/useLanguageStore';
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
  useLanguageStore.getState().setLanguage('en');
});
afterEach(() => jest.restoreAllMocks());
it('opens a locked badge with completed and unfinished missions, and dismisses it', () => {
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: 'Rare Finder, Locked, 1/2. View missions'}));
  expect(screen.getByText('Mission Checklist')).toBeTruthy();
  expect(screen.getByLabelText('Completed: Mammal · Hippopotamus')).toBeTruthy();
  expect(screen.getByLabelText('Pending: Type #2')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Dismiss badge details'));
  expect(screen.queryByText('Mission Checklist')).toBeNull();
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
  fireEvent.press(screen.getByRole('button', {name: 'Take more photos'}));
  expect(navigate).toHaveBeenCalledWith('MainTabs', {screen: 'Catch'});
});
it('updates progress and badge colors immediately when an existing card is corrected', () => {
  const birds = ['Owl', 'Parrot', 'Eagle'].map((name, i) => ({...card(`${i}`, name), animalType: 'Bird' as const}));
  useCollectionStore.setState({collections: birds.slice(0, 1)});
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: /Bird Watcher, Locked, 1\/2/}));
  act(() => useCollectionStore.setState({collections: birds}));
  expect(screen.getByText('Unlocked · Completed!')).toBeTruthy();
  expect(screen.getAllByLabelText('Bird Watcher badge, unlocked')).toHaveLength(2);
  expect(screen.queryByRole('button', {name: 'Take more photos'})).toBeNull();
});

it('directs Zoo Lover to Gallery to favorite animals', () => {
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: /Zoo Lover, Locked, 0\/2/}));
  expect(screen.getByText('Add 2 captured animal species to your favorites')).toBeTruthy();
  expect(screen.getByText('2 species remaining to unlock color badge', {exact: false})).toBeTruthy();
  fireEvent.press(screen.getByRole('button', {name: 'Select favorites in Gallery'}));
  expect(navigate).toHaveBeenCalledWith('MainTabs', {screen: 'Gallery'});
});
it('updates Zoo Lover immediately when favorite flags change', () => {
  const pets = [card('cat', 'Cat'), card('dog', 'Dog')];
  useCollectionStore.setState({collections: pets});
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: /Zoo Lover, Locked, 0\/2/}));
  act(() => useCollectionStore.setState({collections: pets.map(item => ({...item, isFavorite: true}))}));
  expect(screen.getByText('Unlocked · Completed!')).toBeTruthy();
  expect(screen.getAllByLabelText('Zoo Lover badge, unlocked')).toHaveLength(2);
});

it('renders badge detail modal in Thai when language is set to th', () => {
  useLanguageStore.getState().setLanguage('th');
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button', {name: /Rare Finder/}));
  expect(screen.getByText('รายการภารกิจ')).toBeTruthy();
  expect(screen.getByText('Locked · ยังไม่สำเร็จ')).toBeTruthy();
  expect(screen.getByText('ถ่ายสัตว์ให้ครบ 2 ประเภท เช่น Mammal และ Fish')).toBeTruthy();
  expect(screen.getByRole('button', {name: 'ไปถ่ายสัตว์เพิ่ม'})).toBeTruthy();
});
