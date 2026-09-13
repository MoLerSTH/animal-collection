import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PolaroidCard from '../PolaroidCard';
import { AnimalItem } from '../../types';

const animal: AnimalItem = {
  id: 'a1',
  name: 'Moodeng',
  species: 'Hippopotamus',
  category: 'Zoo',
  imageUri: null,
  story: 'I found Moodeng in Chiangmai zoo. Lovely Hippo.',
  favFood: 'Golden Berries',
  temperament: 'Extremely Shy',
  isFavorite: true,
  isLocked: false,
};

describe('PolaroidCard', () => {
  it('renders species, category, and story', () => {
    render(<PolaroidCard animal={animal} />);

    expect(screen.getByText('Hippopotamus')).toBeTruthy();
    expect(screen.getByText('Zoo')).toBeTruthy();
    expect(screen.getByText(/Moodeng in Chiangmai zoo/)).toBeTruthy();
  });

  it('renders the fav snack and temperament attributes', () => {
    render(<PolaroidCard animal={animal} />);

    expect(screen.getByText('Golden Berries')).toBeTruthy();
    expect(screen.getByText('Extremely Shy')).toBeTruthy();
  });

  it('omits the story block when there is no story', () => {
    render(<PolaroidCard animal={{ ...animal, story: '' }} />);

    expect(screen.queryByText('Story & Quirks')).toBeNull();
  });
});
