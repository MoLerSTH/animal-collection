import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AttributeBadge from '../AttributeBadge';

describe('AttributeBadge', () => {
  it('renders the label and value', () => {
    render(<AttributeBadge label="Fav Snack" value="Golden Berries" />);

    expect(screen.getByText('Fav Snack')).toBeTruthy();
    expect(screen.getByText('Golden Berries')).toBeTruthy();
  });

  it('falls back to an em dash when value is empty', () => {
    render(<AttributeBadge label="Temperament" value="" />);

    expect(screen.getByText('—')).toBeTruthy();
  });
});
