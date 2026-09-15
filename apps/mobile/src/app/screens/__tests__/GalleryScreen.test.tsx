import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import GalleryScreen from '../GalleryScreen';

function renderScreen() {
  const navigation = { navigate: jest.fn() } as any;
  const route = { key: 'Gallery', name: 'Gallery' } as any;
  render(<GalleryScreen navigation={navigation} route={route} />);
  return { navigation };
}

describe('GalleryScreen', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('shows the collected count in the header', () => {
    renderScreen();
    expect(screen.getByText(/Collected \d+ \/ \d+/)).toBeTruthy();
  });

  it('shows all caught animals under the "All Animals" filter by default', () => {
    renderScreen();
    // Moodeng is the one favorited, caught animal from the mock catalog
    expect(screen.getByText('Hippopotamus')).toBeTruthy();
  });

  it('filters to only favorites when the Favorites pill is tapped', () => {
    renderScreen();

    fireEvent.press(screen.getByText('Favorites'));

    // Only the favorited Hippopotamus should remain; Red Fox is not a favorite
    expect(screen.getByText('Hippopotamus')).toBeTruthy();
    expect(screen.queryByText('Red Fox')).toBeNull();
  });

  it('navigates to ShareTemplate when an unlocked animal is tapped', () => {
    const { navigation } = renderScreen();

    fireEvent.press(screen.getByLabelText('View Hippopotamus'));

    expect(navigation.navigate).toHaveBeenCalledWith('ShareTemplate', { animalId: 'a1' });
  });
});
