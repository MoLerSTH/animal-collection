import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../OnboardingScreen';
import { appStorage } from '../../../core/storage/mmkv';
import { useCollectionStore, INITIAL_CATALOG_FALLBACK } from '../../../features/collections/stores/useCollectionStore';
import { useAuthStore } from '../../../features/auth/stores/useAuthStore';
import { giftClaimedKey } from '../../../features/collections/stores/starterGift';
const loadCollections = useCollectionStore.getState().loadCollections;
const nav = {
  goBack: jest.fn(),
  replace: jest.fn()
} as any;
beforeEach(() => {
  useAuthStore.setState({user: null, tokens: null, isAuthenticated: false});
  appStorage.clearAll();
  jest.clearAllMocks();
  useCollectionStore.setState({ ownerId: null, catalog: INITIAL_CATALOG_FALLBACK, collections: [] });
});
afterEach(() => useCollectionStore.setState({loadCollections}));
it('allows skipping without claiming a gift', () => {
  render(<OnboardingScreen navigation={nav} route={{
    params: undefined
  } as any} />);
  fireEvent.press(screen.getByText('Skip'));
  expect(appStorage.getString('hasSeenOnboarding')).toBe('true');
  expect(appStorage.getString('starterGiftClaimed')).toBeUndefined();
});
it('persists the free hippo gift once', async () => {
  render(<OnboardingScreen navigation={nav} route={{
    params: undefined
  } as any} />);
  fireEvent.press(screen.getByRole('button', {
    name: 'Claim Gift'
  }));
  await waitFor(() => expect(appStorage.getString('starterGiftClaimed')).toBe('true'));
  expect(useCollectionStore.getState().collections).toHaveLength(1);
  expect(useCollectionStore.getState().collections[0].animalCode).toBe('hippopotamus');
  fireEvent.press(screen.getByRole('button', { name: 'Claim Gift' }));
  expect(useCollectionStore.getState().collections).toHaveLength(1);
});
it('replays instructions without offering another gift', () => {
  render(<OnboardingScreen navigation={nav} route={{
    params: {
      review: true
    }
  } as any} />);
  expect(screen.queryByText('Starter Gift!')).toBeNull();
  fireEvent.press(screen.getByText("Let's Explore!"));
  expect(nav.goBack).toHaveBeenCalled();
});

it('claims for the signed-in account even when a previous account used onboarding on this device', async () => {
  appStorage.set('starterGiftClaimed', 'true');
  appStorage.set('starterGiftOwner', 'old-account');
  useAuthStore.setState({user: {id: 'new-account', name: 'New', email: 'new@example.com'}, isAuthenticated: true});
  useCollectionStore.setState({loadCollections: jest.fn()});
  render(<OnboardingScreen navigation={nav} route={{params: undefined} as any}/>);
  fireEvent.press(screen.getByRole('button', {name: 'Claim Gift'}));
  await waitFor(() => expect(appStorage.getString(giftClaimedKey('new-account'))).toBe('true'));
  expect(useCollectionStore.getState().collections).toEqual([expect.objectContaining({userId: 'new-account', source: 'starter_gift'})]);
  expect(nav.replace).toHaveBeenCalledWith('MainTabs', {screen: 'Gallery'});
});
