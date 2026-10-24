import React from 'react';
import { Image } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PrivateImage } from '../PrivateImage';
import { useAuthStore } from '../../../features/auth/stores/useAuthStore';
import { getApiBaseUrl } from '../../../core/api/config';
it('adds authentication only for photos hosted by our backend', () => {
  useAuthStore.setState({tokens: {accessToken: 'private-token'}});
  render(<PrivateImage source={{uri: `${getApiBaseUrl()}/api/v1/storage/photos/user_a.jpg`}}/>);
  const source = screen.UNSAFE_getByType(Image).props.source;
  // Android's native Image only receives these headers through its array path.
  expect(Array.isArray(source)).toBe(true);
  expect(source[0].headers).toEqual({Authorization: 'Bearer private-token'});
});
it('never sends a session token to an external image host', () => {
  useAuthStore.setState({tokens: {accessToken: 'private-token'}});
  render(<PrivateImage source={{uri: 'https://other.example/api/v1/storage/photos/user_a.jpg'}}/>);
  expect(screen.UNSAFE_getByType(Image).props.source.headers).toBeUndefined();
});

it('restarts a failed native image request with the renewed session', async () => {
  const refreshSession = jest.fn(async () => {
    useAuthStore.setState({tokens: {accessToken: 'renewed-token'}});
    return 'renewed-token';
  });
  const originalRefresh = useAuthStore.getState().refreshSession;
  useAuthStore.setState({user: {id: 'owner'} as any, tokens: {accessToken: 'expired-token'}, refreshSession});
  try {
    render(<PrivateImage source={{uri: `${getApiBaseUrl()}/api/v1/storage/photos/user_owner.jpg`}}/>);
    const failedImage = screen.UNSAFE_getByType(Image);
    const originalUri = failedImage.props.source[0].uri;
    await act(async () => { fireEvent(failedImage, 'error', {nativeEvent: {error: 'HTTP 401'}}); });
    const retriedImage = screen.UNSAFE_getByType(Image);
    expect(retriedImage).not.toBe(failedImage);
    expect(retriedImage.props.source[0].headers).toEqual({Authorization: 'Bearer renewed-token'});
    expect(retriedImage.props.source[0].uri).toBe(originalUri);
    await act(async () => { fireEvent(retriedImage, 'error', {nativeEvent: {error: 'HTTP 503'}}); });
    expect(refreshSession).toHaveBeenCalledTimes(1);
  } finally {
    useAuthStore.setState({refreshSession: originalRefresh});
  }
});

it('restarts private images after account changes', () => {
  useAuthStore.setState({user: {id: 'first'} as any, tokens: {accessToken: 'same-token'}});
  render(<PrivateImage source={{uri: `${getApiBaseUrl()}/api/v1/storage/photos/user_first.jpg`}}/>);
  const firstImage = screen.UNSAFE_getByType(Image);
  act(() => { useAuthStore.setState({user: {id: 'second'} as any}); });
  expect(screen.UNSAFE_getByType(Image)).not.toBe(firstImage);
});
