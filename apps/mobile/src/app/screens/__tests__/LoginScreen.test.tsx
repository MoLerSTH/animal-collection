import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';
import { useAuthStore } from '../../../features/auth/stores/useAuthStore';

function renderScreen() {
  const navigation = { reset: jest.fn(), navigate: jest.fn() } as any;
  const route = { key: 'Login', name: 'Login' } as any;
  render(<LoginScreen navigation={navigation} route={route} />);
  return { navigation };
}

describe('LoginScreen', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      isInitializing: false,
      isDevMode: true,
    });
  });

  it('renders sign in with google button idle and not spinning by default', () => {
    renderScreen();

    // The text "Sign in with Google" must be rendered
    expect(screen.getByText('Sign in with Google')).toBeTruthy();
    
    // The button must be accessible and not disabled
    const button = screen.getByRole('button', { name: 'Sign in with Google' });
    expect(button).toBeTruthy();
    expect(button.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('displays loading indicator and disables button when isLoading is true', () => {
    useAuthStore.setState({ isLoading: true });
    renderScreen();

    // Button should be disabled
    const button = screen.getByRole('button', { name: 'Sign in with Google' });
    expect(button.props.accessibilityState?.disabled).toBe(true);

    // Text "Sign in with Google" should be replaced by ActivityIndicator
    expect(screen.queryByText('Sign in with Google')).toBeNull();
  });

  it('shows dev mode quick user options when isDevMode is true', () => {
    useAuthStore.setState({ isDevMode: true });
    renderScreen();

    expect(screen.getByText(/DEV MODE/)).toBeTruthy();
    expect(screen.getByText(/Jane \(Ranger\)/)).toBeTruthy();
    expect(screen.getByText(/Alex \(Collector\)/)).toBeTruthy();
  });
});

