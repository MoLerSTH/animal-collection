import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AppBottomTabBar from '../AppBottomTabBar';

const mockNavigate = jest.fn();
const mockEmit = jest.fn(() => ({ defaultPrevented: false }));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('AppBottomTabBar (Design System)', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockEmit.mockClear();
  });

  it('renders all tabs in standalone mode and handles navigation', () => {
    render(<AppBottomTabBar activeTab="Gallery" />);

    expect(screen.getByText('Gallery')).toBeTruthy();
    expect(screen.getByText('Catch')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Catch an animal'));
    expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'Catch' });

    fireEvent.press(screen.getByLabelText('Go to Profile'));
    expect(mockNavigate).toHaveBeenCalledWith('MainTabs', { screen: 'User' });
  });

  it('integrates properly with @react-navigation/bottom-tabs props', () => {
    const mockState: any = {
      index: 0,
      routes: [
        { key: 'gallery-key', name: 'Gallery' },
        { key: 'catch-key', name: 'Catch' },
        { key: 'user-key', name: 'User' },
      ],
    };

    const mockTabNavigation: any = {
      emit: mockEmit,
      navigate: jest.fn(),
    };

    render(
      <AppBottomTabBar
        state={mockState}
        navigation={mockTabNavigation}
      />
    );

    fireEvent.press(screen.getByLabelText('Catch an animal'));
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: 'catch-key' })
    );
    expect(mockTabNavigation.navigate).toHaveBeenCalledWith('Catch');
  });
});
