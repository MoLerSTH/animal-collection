import React from 'react';
import { Image } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import GalleryPhoto, { galleryPhotoUrl } from '../GalleryPhoto';
import { getApiBaseUrl } from '../../../core/api/config';
import { useAuthStore } from '../../../features/auth/stores/useAuthStore';

const photo = `${getApiBaseUrl()}/api/v1/storage/photos/user_owner_fish.jpg`;

it('loads an authenticated small preview and hides the spinner after loading', () => {
  useAuthStore.setState({user: null, tokens: {accessToken: 'test-token'}});
  render(<GalleryPhoto uri={photo} name="Goldfish"/>);
  const image = screen.UNSAFE_getByType(Image);
  expect(image.props.source[0]).toMatchObject({uri: `${photo}?variant=thumbnail`, headers: {Authorization: 'Bearer test-token'}});
  expect(screen.getByRole('progressbar')).toBeTruthy();
  fireEvent(image, 'load');
  expect(screen.queryByRole('progressbar')).toBeNull();
});

it('offers retry after a preview fails without downloading the full image', () => {
  useAuthStore.setState({user: null, tokens: null});
  render(<GalleryPhoto uri={photo} name="Goldfish"/>);
  const failedImage = screen.UNSAFE_getByType(Image);
  fireEvent(failedImage, 'error', {nativeEvent: {error: 'Network unavailable'}});
  expect(screen.getByText('Photo unavailable')).toBeTruthy();
  const stopPropagation = jest.fn();
  fireEvent.press(screen.getByRole('button', {name: 'Retry photo of Goldfish'}), {stopPropagation});
  expect(stopPropagation).toHaveBeenCalledTimes(1);
  const retried = screen.UNSAFE_getByType(Image);
  expect(retried).not.toBe(failedImage);
  expect(retried.props.source[0].uri).toBe(`${photo}?variant=thumbnail`);
  expect(screen.getByRole('progressbar')).toBeTruthy();
});

it('does not modify local files or send thumbnail parameters to external hosts', () => {
  expect(galleryPhotoUrl('file:///captures/fish.jpg')).toBe('file:///captures/fish.jpg');
  const external = 'https://other.example/api/v1/storage/photos/fish.jpg';
  expect(galleryPhotoUrl(external)).toBe(external);
});

it('resets the loading state when a card displays a different photo', () => {
  const {rerender} = render(<GalleryPhoto uri={photo} name="Goldfish"/>);
  fireEvent(screen.UNSAFE_getByType(Image), 'load');
  rerender(<GalleryPhoto uri={`${photo}-new`} name="Cat"/>);
  expect(screen.getByRole('progressbar', {name: 'Loading photo of Cat'})).toBeTruthy();
});
