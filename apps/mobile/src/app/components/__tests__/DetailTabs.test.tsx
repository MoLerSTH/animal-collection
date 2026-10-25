import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import DetailTabs from '../DetailTabs';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('DetailTabs', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders all tab items including the prominent banking-style catch button', () => {
    render(<DetailTabs />);

    expect(screen.getByText('Gallery')).toBeTruthy();
    expect(screen.getByText('Catch')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByLabelText('Catch an animal')).toBeTruthy();
  });

  it('navigates to Gallery when Gallery tab is pressed', () => {
    render(<DetailTabs />);

    fireEvent.press(screen.getByLabelText('Go to Gallery'));
    expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'Gallery' });
  });

  it('navigates to Catch when Catch button is pressed', () => {
    render(<DetailTabs />);

    fireEvent.press(screen.getByLabelText('Catch an animal'));
    expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'Catch' });
  });

  it('navigates to Profile when Profile tab is pressed', () => {
    render(<DetailTabs />);

    fireEvent.press(screen.getByLabelText('Go to Profile'));
    expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'User' });
  });
});
