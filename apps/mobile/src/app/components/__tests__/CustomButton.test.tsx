import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CustomButton from '../CustomButton';

describe('CustomButton', () => {
  it('renders the given label', () => {
    render(<CustomButton label="Confirm" onPress={() => {}} />);
    expect(screen.getByText('Confirm')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    render(<CustomButton label="Confirm" onPress={onPress} />);

    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    render(<CustomButton label="Confirm" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows a loading indicator instead of the label when loading', () => {
    render(<CustomButton label="Confirm" onPress={() => {}} loading />);
    expect(screen.queryByText('Confirm')).toBeNull();
  });

  it('does not call onPress while loading', () => {
    const onPress = jest.fn();
    render(<CustomButton label="Confirm" onPress={onPress} loading />);

    fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));

    expect(onPress).not.toHaveBeenCalled();
  });
});
