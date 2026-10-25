import React from 'react';
import { Alert, Linking } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../SettingsScreen';
import UserProfileScreen from '../UserProfileScreen';
import { useAuthStore } from '../../../features/auth/stores/useAuthStore';
import { useLanguageStore } from '../../../core/i18n/useLanguageStore';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'), useNavigation: () => ({navigate: mockNavigate}),
}));
const mockNavigate = jest.fn();
const signOut = jest.fn();
const deleteAccount = jest.fn();
const updateUsername = jest.fn();
const actualSignOut = useAuthStore.getState().signOut;
const actualDelete = useAuthStore.getState().deleteAccount;
const actualUpdateUsername = useAuthStore.getState().updateUsername;
const navigation = {goBack:jest.fn(), navigate:jest.fn(), reset:jest.fn()} as any;
const showSettings = () => render(<SettingsScreen navigation={navigation} route={{name:'Settings'} as any}/>);
beforeEach(() => {
  jest.clearAllMocks();
  useLanguageStore.getState().setLanguage('en');
  useAuthStore.setState({user:{id:'settings-test',name:'Hippo Fan',email:'fan@example.com'},tokens:{accessToken:'session'},isAuthenticated:true,isLoading:false,signOut,deleteAccount,updateUsername});
  signOut.mockResolvedValue(undefined);
  deleteAccount.mockResolvedValue(undefined);
  updateUsername.mockResolvedValue(undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  useLanguageStore.getState().setLanguage('en');
  useAuthStore.setState({signOut:actualSignOut,deleteAccount:actualDelete,updateUsername:actualUpdateUsername});
});

it('opens the current username, rejects blank/short/unchanged names and cancels without saving', () => {
  showSettings();
  fireEvent.press(screen.getByRole('button',{name:'Change username'}));
  expect(screen.getByLabelText('Username').props.value).toBe('Hippo Fan');
  expect(screen.getByRole('button',{name:'Save username'})).toBeDisabled();
  for (const value of ['  ', 'a', 'two\nlines']) {
    fireEvent.changeText(screen.getByLabelText('Username'),value);
    expect(screen.getByRole('button',{name:'Save username'})).toBeDisabled();
  }
  fireEvent.press(screen.getByRole('button',{name:'Cancel name change'}));
  expect(screen.queryByLabelText('Username')).toBeNull();
  expect(updateUsername).not.toHaveBeenCalled();
});

it('saves the trimmed username and shows the updated profile', async () => {
  updateUsername.mockImplementation(async (name: string) => {
    useAuthStore.setState({user:{...useAuthStore.getState().user!,name}});
  });
  showSettings();
  fireEvent.press(screen.getByRole('button',{name:'Change username'}));
  fireEvent.changeText(screen.getByLabelText('Username'),'  นักสำรวจ  ');
  fireEvent.press(screen.getByRole('button',{name:'Save username'}));
  await waitFor(() => expect(screen.queryByLabelText('Username')).toBeNull(), { timeout: 3000 });
  expect(updateUsername).toHaveBeenCalledWith('นักสำรวจ');
  expect(screen.getByText('นักสำรวจ')).toBeTruthy();
});

it('keeps the draft for retry when saving fails', async () => {
  updateUsername.mockRejectedValue(new Error('offline'));
  showSettings();
  fireEvent.press(screen.getByRole('button',{name:'Change username'}));
  fireEvent.changeText(screen.getByLabelText('Username'),'New Name');
  fireEvent.press(screen.getByRole('button',{name:'Save username'}));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect(screen.getByLabelText('Username').props.value).toBe('New Name');
  expect(screen.getByRole('button',{name:'Save username'})).not.toBeDisabled();
});

it('opens Settings from the profile gear and displays the current account', () => {
  render(<UserProfileScreen/>);
  fireEvent.press(screen.getByRole('button',{name:'Open settings'}));
  expect(mockNavigate).toHaveBeenCalledWith('Settings');
  screen.unmount();
  showSettings();
  expect(screen.getByText('Hippo Fan')).toBeTruthy();
  expect(screen.getByText('fan@example.com')).toBeTruthy();
  expect(screen.getByText('Version 1.0.0')).toBeTruthy();
});

it('opens device settings and links to the privacy explanation', () => {
  const open = jest.spyOn(Linking,'openSettings').mockResolvedValue(undefined);
  showSettings();
  fireEvent.press(screen.getByRole('button',{name:'Camera permissions'}));
  expect(open).toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button',{name:'Privacy & data'}));
  expect(navigation.navigate).toHaveBeenCalledWith('Privacy');
});

it('opens a report email without including account credentials', () => {
  const open = jest.spyOn(Linking,'openURL').mockResolvedValue(undefined);
  showSettings();
  fireEvent.press(screen.getByRole('button',{name:'Report a problem'}));
  expect(open).toHaveBeenCalledWith(expect.stringContaining('mailto:bike2920@gmail.com?subject='));
  expect(open.mock.calls[0][0]).not.toContain('session');
});

it('requires confirmation before signing out and returns to Login', async () => {
  const alert = jest.spyOn(Alert,'alert');
  showSettings();
  fireEvent.press(screen.getByRole('button',{name:'Sign out'}));
  expect(signOut).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0][2]!;
  await buttons.find(button => button.text === 'Sign out')!.onPress!();
  expect(signOut).toHaveBeenCalledTimes(1);
  expect(navigation.reset).toHaveBeenCalledWith({index:0,routes:[{name:'Login'}]});
});

it('requires the exact DELETE confirmation and does not delete when canceled', () => {
  showSettings();
  fireEvent.press(screen.getByRole('button',{name:'Delete account'}));
  expect(screen.getByRole('button',{name:'Confirm delete account'})).toBeDisabled();
  fireEvent.changeText(screen.getByLabelText('Delete account confirmation'),'delete');
  expect(screen.getByRole('button',{name:'Confirm delete account'})).toBeDisabled();
  fireEvent.press(screen.getByRole('button',{name:'Cancel account deletion'}));
  expect(deleteAccount).not.toHaveBeenCalled();
});

it('deletes only after explicit confirmation, then returns to Login', async () => {
  showSettings();
  fireEvent.press(screen.getByRole('button',{name:'Delete account'}));
  fireEvent.changeText(screen.getByLabelText('Delete account confirmation'),'DELETE');
  fireEvent.press(screen.getByRole('button',{name:'Confirm delete account'}));
  await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(navigation.reset).toHaveBeenCalledWith({index:0,routes:[{name:'Login'}]}));
});

it('keeps the confirmation screen and reports a failed deletion', async () => {
  deleteAccount.mockRejectedValueOnce(new Error('Offline'));
  const alert = jest.spyOn(Alert,'alert');
  showSettings();
  fireEvent.press(screen.getByRole('button',{name:'Delete account'}));
  fireEvent.changeText(screen.getByLabelText('Delete account confirmation'),'DELETE');
  fireEvent.press(screen.getByRole('button',{name:'Confirm delete account'}));
  await waitFor(() => expect(alert).toHaveBeenCalledWith('Could not delete account',expect.any(String)));
  expect(navigation.reset).not.toHaveBeenCalled();
});

it('opens language modal and switches language between English and Thai', () => {
  showSettings();
  expect(screen.getByText('Settings')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Language' }));
  expect(screen.getByText('Select Language')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'ไทย (Thai)' }));
  expect(screen.getByText('การตั้งค่า')).toBeTruthy();
  expect(screen.getByText('ภาษา (Language)')).toBeTruthy();

  // Switch back to English
  fireEvent.press(screen.getByRole('button', { name: 'ภาษา (Language)' }));
  fireEvent.press(screen.getByRole('button', { name: 'English (US)' }));
  expect(screen.getByText('Settings')).toBeTruthy();
});
