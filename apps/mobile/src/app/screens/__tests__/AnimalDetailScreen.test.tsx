import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import AnimalDetailScreen from '../AnimalDetailScreen';
import { useCollectionStore, INITIAL_CATALOG_FALLBACK } from '../../../features/collections/stores/useCollectionStore';
import { useAuthStore } from '../../../features/auth/stores/useAuthStore';
import { appStorage, StorageKeys } from '../../../core/storage/mmkv';
const nav = {
  navigate: jest.fn(),
  goBack: jest.fn()
} as any;
const originalRename = useCollectionStore.getState().renameCollection;
const originalAdd = useCollectionStore.getState().addCollection;
const originalIdentification = useCollectionStore.getState().updateIdentification;
beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({user:null,tokens:null,isAuthenticated:false,isLoading:false});
  appStorage.clearAll();
  useCollectionStore.setState({
    catalog: INITIAL_CATALOG_FALLBACK,
    collections: [{id:'a1',userId:'detail-test',name:'Hippopotamus',animalId:'a1',animalSpecies:'Hippopotamus',identifiedSpecies:'Hippopotamus',category:'Zoo',photoUrl:'https://example.com/hippo.jpg',story:'',favFood:'',temperament:'',isFavorite:false}],
    isSubmitting: false, isSyncing: false, renameCollection: originalRename, addCollection:originalAdd, updateIdentification:originalIdentification,
  });
});
it('edits the existing card name and displays the confirmed name', async () => {
  const rename = jest.fn().mockImplementation(async (id, name) => {
    useCollectionStore.setState(state => ({collections:state.collections.map(item => item.id === id ? {...item,name} : item)}));
  });
  useCollectionStore.setState({renameCollection:rename});
  render(<AnimalDetailScreen navigation={nav} route={{params:{animalId:'a1'}} as any}/>);
  fireEvent.press(screen.getByRole('button',{name:'Edit card name'}));
  fireEvent.changeText(screen.getByLabelText('Card name'),'  หมูเด้ง  ');
  fireEvent.press(screen.getByRole('button',{name:'Save card name'}));
  await waitFor(() => expect(screen.queryByLabelText('Card name')).toBeNull());
  expect(rename).toHaveBeenCalledWith('a1','หมูเด้ง');
  expect(screen.getByRole('header',{name:'หมูเด้ง'})).toBeTruthy();
});

it('updates the heading before the PATCH completes and confirms it without navigation', async () => {
  const originalFetch = globalThis.fetch;
  const card={id:'e6ca995a-e98d-407a-8b70-39100a9c17f7',userId:'detail-test',name:'Hippopotamus',animalSpecies:'Hippopotamus',identifiedSpecies:'Hippopotamus',category:'Zoo',photoUrl:'file:///hippo.jpg',story:'',favFood:'',temperament:'',isFavorite:false};
  const owner={id:card.userId,name:'Tester',email:'test@example.com'};
  appStorage.set(StorageKeys.AUTH_USER,JSON.stringify(owner));
  useAuthStore.setState({user:owner,tokens:{accessToken:'test-session'},isAuthenticated:true});
  useCollectionStore.setState({collections:[card],renameCollection:originalRename,ownerId:owner.id,isSyncing:false});
  let finish!: (response:unknown)=>void;
  globalThis.fetch=jest.fn().mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  try {
    render(<AnimalDetailScreen navigation={nav} route={{params:{animalId:card.id}} as any}/>);
    fireEvent.press(screen.getByRole('button',{name:'Edit card name'}));
    fireEvent.changeText(screen.getByLabelText('Card name'),'หมูเด้งชื่อใหม่');
    fireEvent.press(screen.getByRole('button',{name:'Save card name'}));
    expect(screen.getByRole('header',{name:'หมูเด้งชื่อใหม่'})).toBeTruthy();
    expect(screen.getByText('Saving name…')).toBeTruthy();
    expect(screen.queryByLabelText('Card name')).toBeNull();
    await act(async()=>{finish({ok:true,status:200,json:async()=>({...card,name:'หมูเด้งชื่อใหม่'})});});
    await waitFor(()=>expect(screen.getByRole('header',{name:'หมูเด้งชื่อใหม่'})).toBeTruthy());
    expect(screen.queryByLabelText('Card name')).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining(`/collections/${card.id}/name`),expect.objectContaining({method:'PATCH',body:JSON.stringify({name:'หมูเด้งชื่อใหม่'})}));
    expect(nav.goBack).not.toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalled();
  } finally {globalThis.fetch=originalFetch;}
});

it('restores the previous heading and the name editor if the background PATCH fails', async () => {
  const originalFetch=globalThis.fetch;
  const card=useCollectionStore.getState().collections[0];
  useAuthStore.setState({user:{id:card.userId,name:'Tester',email:'test@example.com'},tokens:{accessToken:'test-session'},isAuthenticated:true});
  useCollectionStore.setState({ownerId:card.userId,collections:[card],renameCollection:originalRename,isSyncing:false});
  let finish!:(value:unknown)=>void;
  globalThis.fetch=jest.fn().mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  try {
    render(<AnimalDetailScreen navigation={nav} route={{params:{animalId:card.id}} as any}/>);
    fireEvent.press(screen.getByRole('button',{name:'Edit card name'}));
    fireEvent.changeText(screen.getByLabelText('Card name'),'New Name');
    fireEvent.press(screen.getByRole('button',{name:'Save card name'}));
    expect(screen.getByRole('header',{name:'New Name'})).toBeTruthy();
    await act(async()=>{finish({ok:false,status:503});});
    await waitFor(()=>expect(screen.getByRole('header',{name:card.name})).toBeTruthy());
    expect(screen.getByLabelText('Card name').props.value).toBe('New Name');
    expect(screen.getByText('Could not change the card name. Please try again.')).toBeTruthy();
  } finally {globalThis.fetch=originalFetch;}
});

it('keeps the current card title after a rename when an older route points to its previous name', async () => {
  useCollectionStore.setState({collections:[{
    id:'fish-card',userId:'detail-test',name:'Hippopotamus',identifiedSpecies:'Goldfish',animalSpecies:'Goldfish',
    category:'Wild',photoUrl:'file:///fish.jpg',story:'',favFood:'',temperament:'',isFavorite:false,
  }],renameCollection:jest.fn().mockImplementation(async (id,name)=>{
    useCollectionStore.setState(state=>({collections:state.collections.map(item=>item.id===id?{...item,name}:item)}));
  })});
  render(<AnimalDetailScreen navigation={nav} route={{params:{animalId:'Hippopotamus'}} as any}/>);
  fireEvent.press(screen.getByRole('button',{name:'Edit card name'}));
  fireEvent.changeText(screen.getByLabelText('Card name'),'ปลาอ้วน');
  fireEvent.press(screen.getByRole('button',{name:'Save card name'}));
  await waitFor(()=>expect(screen.queryByLabelText('Card name')).toBeNull());
  expect(screen.getByText('ปลาอ้วน')).toBeTruthy();
  expect(screen.queryByText('Hippopotamus')).toBeNull();
});

it('updates the title without leaving the detail screen when a default species name is corrected', async () => {
  const update=jest.fn().mockImplementation(async (id,facts)=>{
    useCollectionStore.setState(state=>({collections:state.collections.map(item=>item.id===id?{...item,...facts,name:facts.identifiedSpecies,animalSpecies:facts.identifiedSpecies,animalId:null}:item)}));
  });
  useCollectionStore.setState({updateIdentification:update});
  render(<AnimalDetailScreen navigation={nav} route={{params:{animalId:'Hippopotamus'}} as any}/>);
  fireEvent.press(screen.getByRole('button',{name:'ระบุประเภทสัตว์'}));
  fireEvent.changeText(screen.getByLabelText('Identified species'),'Goldfish');
  fireEvent.press(screen.getByRole('button',{name:'บันทึกข้อมูลสัตว์'}));
  await waitFor(()=>expect(update).toHaveBeenCalled());
  await waitFor(()=>expect(screen.queryByLabelText('Identified species')).toBeNull());
  expect(screen.getByText('Goldfish')).toBeTruthy();
  expect(screen.queryByText('Hippopotamus')).toBeNull();
});

it('keeps the confirmed title through local-to-server synchronization and later album reloads', async () => {
  const requestId='12345678-1234-4234-8234-123456789abc';
  const localId=`local_coll_${requestId}`;
  const local={id:localId,userId:'detail-test',name:'My Fish',identifiedSpecies:'Goldfish',animalSpecies:'Goldfish',category:'Wild',photoUrl:'file:///fish.jpg',story:'',favFood:'',temperament:'',isFavorite:false};
  useCollectionStore.setState({collections:[local]});
  render(<AnimalDetailScreen navigation={nav} route={{params:{animalId:localId}} as any}/>);
  act(()=>useCollectionStore.setState({collections:[{...local,id:requestId,localId,name:'ปลาอ้วน'}]}));
  expect(screen.getByText('ปลาอ้วน')).toBeTruthy();
  act(()=>useCollectionStore.setState({collections:[{...local,id:requestId,name:'ปลาอ้วน'}]}));
  expect(screen.getByText('ปลาอ้วน')).toBeTruthy();
  fireEvent.press(screen.getByRole('button',{name:'Share'}));
  expect(nav.navigate).toHaveBeenCalledWith('ShareTemplate',{animalId:requestId});
});

it('switches the selected card when navigation reuses the detail screen', () => {
  const card=useCollectionStore.getState().collections[0];
  useCollectionStore.setState({collections:[card,{...card,id:'second-card',name:'Second Card'}]});
  const {rerender}=render(<AnimalDetailScreen navigation={nav} route={{params:{animalId:card.id}} as any}/>);
  rerender(<AnimalDetailScreen navigation={nav} route={{params:{animalId:'second-card'}} as any}/>);
  expect(screen.getByText('Second Card')).toBeTruthy();
  fireEvent.press(screen.getByRole('button',{name:'Share'}));
  expect(nav.navigate).toHaveBeenCalledWith('ShareTemplate',{animalId:'second-card'});
});

it('keeps the name editor open on failure and rejects blank names', async () => {
  const rename = jest.fn().mockRejectedValue(new Error('offline'));
  useCollectionStore.setState({renameCollection:rename});
  render(<AnimalDetailScreen navigation={nav} route={{params:{animalId:'a1'}} as any}/>);
  fireEvent.press(screen.getByRole('button',{name:'Edit card name'}));
  fireEvent.changeText(screen.getByLabelText('Card name'),'   ');
  expect(screen.getByRole('button',{name:'Save card name'})).toBeDisabled();
  fireEvent.changeText(screen.getByLabelText('Card name'),'New Name');
  fireEvent.press(screen.getByRole('button',{name:'Save card name'}));
  await waitFor(() => expect(screen.getByText('Could not change the card name. Please try again.')).toBeTruthy());
  expect(screen.getByLabelText('Card name').props.value).toBe('New Name');
});
it('shows existing discovery without allowing duplicate save', () => {
  render(<AnimalDetailScreen navigation={nav} route={{
    params: {
      animalId: 'a1'
    }
  } as any} />);
  expect(screen.getByText('Hippopotamus')).toBeTruthy();
  expect(screen.getByRole('button', {
    name: 'In Collection'
  })).toBeDisabled();
});
it('saves an identified photo then enables sharing', async () => {
  const add = jest.fn().mockResolvedValue({
    id: 'capture-1'
  });
  useCollectionStore.setState({
    addCollection: add
  });
  render(<AnimalDetailScreen navigation={nav} route={{
    params: {
      imageUri: 'file:///capture.jpg',
      identifiedSpecies: 'Hippopotamus'
    }
  } as any} />);
  expect(screen.getByRole('button', {
    name: 'Share'
  })).toBeDisabled();
  fireEvent.press(screen.getByRole('button', {
    name: 'Add to Collection'
  }));
  await waitFor(() => expect(add).toHaveBeenCalledWith(expect.objectContaining({
    photoUri: 'file:///capture.jpg',
    animalId: 'a1'
  })));
  await waitFor(() => expect(screen.getByRole('button', {
    name: 'Share'
  })).not.toBeDisabled());
  fireEvent.press(screen.getByRole('button', {
    name: 'Share'
  }));
  expect(nav.navigate).toHaveBeenCalledWith('ShareTemplate', {
    animalId: 'capture-1'
  });
});

it('keeps the AI identification separate from the editable card nickname', async () => {
  const add = jest.fn().mockResolvedValue({id: 'fish-1'});
  useCollectionStore.setState({addCollection: add});
  render(<AnimalDetailScreen navigation={nav} route={{params: {
    imageUri: 'file:///fish.jpg', identifiedSpecies: 'Goldfish', animalType: 'Fish', habitatTags: ['aquatic'], capturedAt: '2026-10-23T13:00:00Z',
  }} as any}/>);
  fireEvent.changeText(screen.getByLabelText('Animal name'), 'ปลาอ้วนๆ');
  fireEvent.press(screen.getByRole('button', {name: 'Add to Collection'}));
  await waitFor(() => expect(add).toHaveBeenCalledWith(expect.objectContaining({
    name: 'ปลาอ้วนๆ', identifiedSpecies: 'Goldfish', animalType: 'Fish', habitatTags: ['aquatic'], capturedAt: '2026-10-23T13:00:00Z',
  })));
});

it('lets the user correct a legacy card type without changing its nickname', async () => {
  const updateIdentification = jest.fn().mockResolvedValue(undefined);
  useCollectionStore.setState({updateIdentification, catalog: [], collections: [{
    id: 'fish-old', userId: 'u1', animalSpecies: 'ปลาอ้วนๆ', name: 'ปลาอ้วนๆ', photoUrl: 'file:///old.jpg',
    category: 'Wild', story: '', temperament: '', favFood: '', isFavorite: false, source: 'capture', animalType: 'Unknown',
  }]});
  render(<AnimalDetailScreen navigation={nav} route={{params: {animalId: 'fish-old'}} as any}/>);
  fireEvent.press(screen.getByRole('button', {name: 'ระบุประเภทสัตว์'}));
  fireEvent.changeText(screen.getByLabelText('Identified species'), 'Goldfish');
  fireEvent.press(screen.getByRole('button', {name: 'Type Fish'}));
  fireEvent.press(screen.getByRole('button', {name: 'บันทึกข้อมูลสัตว์'}));
  await waitFor(() => expect(updateIdentification).toHaveBeenCalledWith('fish-old', {
    identifiedSpecies: 'Goldfish', animalType: 'Fish', habitatTags: [],
  }));
  expect(screen.getByText('ปลาอ้วนๆ')).toBeTruthy();
});

it('saves without coordinates if optional GPS does not respond within five seconds', async () => {
  jest.useFakeTimers();
  try {
    const Location = require('expo-location');
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({granted: true});
    jest.mocked(Location.getCurrentPositionAsync).mockImplementationOnce(() => new Promise(() => {}));
    const add = jest.fn().mockResolvedValue({id: 'no-gps-card'});
    useCollectionStore.setState({addCollection: add});
    render(<AnimalDetailScreen navigation={nav} route={{params: {imageUri: 'file:///photo.jpg', identifiedSpecies: 'Cat'}} as any}/>);
    fireEvent.press(screen.getByRole('button', {name: 'Add to Collection'}));
    const {act} = require('@testing-library/react-native');
    await act(async () => { await jest.advanceTimersByTimeAsync(5000); });
    expect(add).toHaveBeenCalledWith(expect.objectContaining({name: 'Cat'}));
    expect(add.mock.calls[0][0].latitude).toBeUndefined();
  } finally { jest.useRealTimers(); }
});
