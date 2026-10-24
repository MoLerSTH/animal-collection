import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import GalleryScreen from '../GalleryScreen';
import { useCollectionStore, INITIAL_CATALOG_FALLBACK } from '../../../features/collections/stores/useCollectionStore';
import { useAuthStore } from '../../../features/auth/stores/useAuthStore';
import { appStorage } from '../../../core/storage/mmkv';
beforeEach(() => {
  appStorage.clearAll();
  useAuthStore.setState({user: {id: 'gallery-test', name: 'Test', email: 'test@example.com'}, tokens: null});
  useCollectionStore.setState({
    ownerId: 'gallery-test', starterGiftAvailable: false,
    catalog: INITIAL_CATALOG_FALLBACK,
    collections: [{id:'a1',userId:'gallery-test',name:'Hippopotamus',animalId:'a1',animalSpecies:'Hippopotamus',identifiedSpecies:'Hippopotamus',category:'Zoo',photoUrl:'https://example.com/hippo.jpg',story:'',favFood:'',temperament:'',isFavorite:true,animalType:'Mammal'}],
    loadCollections: jest.fn()
  });
});
it('shows discovered species only and no locked silhouettes', () => {
  render(<GalleryScreen />);
  expect(screen.getByText('Total Discovered: 1 Species')).toBeTruthy();
  expect(screen.getByText('Hippopotamus')).toBeTruthy();
  expect(screen.queryByText('Badger')).toBeNull();
  expect(screen.queryByText('?')).toBeNull();
});
it('combines search and category filters', () => {
  render(<GalleryScreen />);
  fireEvent.changeText(screen.getByLabelText('Search animals'), 'hippo');
  expect(screen.getByText('Hippopotamus')).toBeTruthy();
  fireEvent.press(screen.getByText('Birds'));
  expect(screen.queryByText('Hippopotamus')).toBeNull();
  expect(screen.getByText(/No discoveries here/)).toBeTruthy();
});
it('filters by favorites', () => {
  render(<GalleryScreen />);
  fireEvent.press(screen.getByText('Favorites'));
  expect(screen.getByText('Hippopotamus')).toBeTruthy();
});

it('offers a new account its own gift and shows the card immediately after claiming', () => {
  useCollectionStore.setState({collections: [], starterGiftAvailable: true});
  render(<GalleryScreen/>);
  expect(screen.getByText('Starter Gift!')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', {name: 'Claim Gift'}));
  expect(screen.queryByText('Starter Gift!')).toBeNull();
  expect(screen.getByText('Hippopotamus')).toBeTruthy();
  expect(useCollectionStore.getState().collections).toHaveLength(1);
  expect(useCollectionStore.getState().collections[0].userId).toBe('gallery-test');
});

it('does not offer a gift to an account that already claimed it', () => {
  render(<GalleryScreen/>);
  expect(screen.queryByRole('button', {name: 'Claim Gift'})).toBeNull();
});
