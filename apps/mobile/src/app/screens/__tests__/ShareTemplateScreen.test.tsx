import React from 'react';
import { Share } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import ShareTemplateScreen from '../ShareTemplateScreen';
import { useCollectionStore, INITIAL_CATALOG_FALLBACK } from '../../../features/collections/stores/useCollectionStore';
const nav = {
  navigate: jest.fn(),
  goBack: jest.fn()
} as any;
const show = () => render(<ShareTemplateScreen navigation={nav} route={{
  params: {
    animalId: 'a1'
  }
} as any} />);
beforeEach(() => {
  jest.clearAllMocks();
  useCollectionStore.setState({
    catalog: INITIAL_CATALOG_FALLBACK,
    collections: [{id:'a1',userId:'share-test',name:'Hippopotamus',animalId:'a1',animalSpecies:'Hippopotamus',identifiedSpecies:'Hippopotamus',category:'Zoo',photoUrl:'https://example.com/hippo.jpg',story:'',favFood:'',temperament:'',isFavorite:false}]
  });
});
it('renders all requested destinations and allows caption edits', () => {
  show();
  for (const name of ['Instagram', 'Facebook', 'X', 'LINE', 'More']) expect(screen.getByLabelText(`Share to ${name}`)).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Edit caption'));
  fireEvent.changeText(screen.getByLabelText('Share caption'), 'My hippo');
  expect(screen.getByDisplayValue('My hippo')).toBeTruthy();
});
it('opens the native share sheet with the discovery', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({
    action: Share.sharedAction
  });
  show();
  fireEvent.press(screen.getByLabelText('Share to More'));
  await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({
    message: expect.stringContaining('Hippopotamus')
  })));
});
it('returns to the previous screen', () => {
  show();
  fireEvent.press(screen.getByLabelText('Go back'));
  expect(nav.goBack).toHaveBeenCalled();
});
it('shows a confirmed card rename while keeping an explicitly edited share caption', () => {
  show();
  act(()=>useCollectionStore.setState(state=>({collections:state.collections.map(item=>({...item,name:'หมูเด้ง'}))})));
  expect(screen.getByText('หมูเด้ง')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('Edit caption'));
  fireEvent.changeText(screen.getByLabelText('Share caption'),'My custom caption');
  act(()=>useCollectionStore.setState(state=>({collections:state.collections.map(item=>({...item,name:'New Name'}))})));
  expect(screen.getByDisplayValue('My custom caption')).toBeTruthy();
});
it('exports and shares the composed polaroid when image sharing is available', async () => {
  const Sharing = require('expo-sharing');
  const Shot = require('react-native-view-shot');
  Sharing.isAvailableAsync.mockResolvedValueOnce(true);
  show();
  fireEvent.press(screen.getByLabelText('Share to More'));
  await waitFor(() => expect(Sharing.shareAsync).toHaveBeenCalledWith('/tmp/polaroid.png', expect.objectContaining({
    mimeType: 'image/png'
  })));
  expect(Shot.captureRef).toHaveBeenCalled();
});
