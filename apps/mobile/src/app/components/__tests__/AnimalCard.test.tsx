import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AnimalCard from '../AnimalCard';
import { AnimalItem } from '../../types';

const baseAnimal: AnimalItem = {
  id: 'a1',
  name: 'Moodeng',
  species: 'Hippopotamus',
  category: 'Zoo',
  imageUri: null,
  story: '',
  favFood: 'Golden Berries',
  temperament: 'Extremely Shy',
  isFavorite: false,
  isLocked: false,
};

describe('AnimalCard', () => {
  it('renders a locked placeholder without calling onPress support', () => {
    render(<AnimalCard animal={{ ...baseAnimal, isLocked: true }} onPress={jest.fn()} />);

    // Locked cards show no species label
    expect(screen.queryByText('Hippopotamus')).toBeNull();
  });

  it('renders the species name for an unlocked animal', () => {
    render(<AnimalCard animal={baseAnimal} onPress={jest.fn()} />);
    expect(screen.getByText('Hippopotamus')).toBeTruthy();
  });

  it('calls onPress with the animal when tapped', () => {
    const onPress = jest.fn();
    render(<AnimalCard animal={baseAnimal} onPress={onPress} />);

    fireEvent.press(screen.getByLabelText('View Hippopotamus'));

    expect(onPress).toHaveBeenCalledWith(baseAnimal);
  });

  it('does not fire onPress for a locked card since it renders no pressable', () => {
    const onPress = jest.fn();
    render(<AnimalCard animal={{ ...baseAnimal, isLocked: true }} onPress={onPress} />);

    expect(screen.queryByLabelText('View Hippopotamus')).toBeNull();
    expect(onPress).not.toHaveBeenCalled();
  });
});
