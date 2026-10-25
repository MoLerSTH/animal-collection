import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import MainTabNavigator from '../MainTabNavigator';

// Mock child screens so we test the tab bar structure in isolation
jest.mock('../../screens/GalleryScreen', () => {
  const { Text } = require('react-native');
  return function MockGalleryScreen() {
    return <Text testID="gallery-screen">Gallery Screen</Text>;
  };
});

jest.mock('../../screens/CameraScreen', () => {
  const { Text } = require('react-native');
  return function MockCameraScreen() {
    return <Text testID="camera-screen">Camera Screen</Text>;
  };
});

jest.mock('../../screens/UserProfileScreen', () => {
  const { Text } = require('react-native');
  return function MockUserProfileScreen() {
    return <Text testID="user-screen">User Profile Screen</Text>;
  };
});

describe('MainTabNavigator', () => {
  it('renders all tabs and the prominent banking-style catch button', () => {
    render(
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>
    );

    expect(screen.getByText('Gallery')).toBeTruthy();
    expect(screen.getByText('Catch')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByLabelText('Catch an animal')).toBeTruthy();
  });

  it('navigates to Catch screen when the prominent center button is pressed', () => {
    render(
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>
    );

    const catchButton = screen.getByLabelText('Catch an animal');
    fireEvent.press(catchButton);

    expect(screen.getByText('Camera Screen')).toBeTruthy();
  });
});
