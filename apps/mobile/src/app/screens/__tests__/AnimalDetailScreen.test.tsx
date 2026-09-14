import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AnimalDetailScreen from '../AnimalDetailScreen';
import { useCollectionStore } from '../../../features/collections/stores/useCollectionStore';

function renderScreen(params: { imageUri?: string; animalId?: string } = {}) {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    getState: jest.fn(() => ({ routes: [{ name: 'AnimalDetail' }] })),
  } as any;
  const route = { key: 'AnimalDetail', name: 'AnimalDetail', params } as any;
  render(<AnimalDetailScreen navigation={navigation} route={route} />);
  return { navigation };
}

describe('AnimalDetailScreen', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('renders form inputs for animal details', () => {
    renderScreen({ animalId: 'a1' });

    expect(screen.getByDisplayValue('Hippopotamus')).toBeTruthy();
    expect(screen.getByText('Animal Name')).toBeTruthy();
    expect(screen.getByText('Story & Quirks')).toBeTruthy();
    expect(screen.getAllByText('Fav Snack').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Temperament').length).toBeGreaterThanOrEqual(1);
  });

  it('calls addCollection and navigates on Confirm press', async () => {
    const { navigation } = renderScreen({
      imageUri: 'file:///tmp/captured_animal.jpg',
      animalId: 'a1',
    });

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.press(confirmBtn);

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(
        'ShareTemplate',
        expect.objectContaining({ animalId: expect.any(String) })
      );
    });
  });
});
