import { useCollectionStore } from '../useCollectionStore';
import { useAuthStore } from '../../../auth/stores/useAuthStore';
import { appStorage } from '../../../../core/storage/mmkv';
import { readCollectionCache } from '../collectionCache';
import { renameCollectionApi, fetchCatalogApi, fetchUserCollectionsApi, fetchCollectionSummaryApi, claimStarterGiftApi } from '../../api/collectionApi';
import { CatalogAnimal, UserCollectionItem } from '../../types';

jest.mock('../../api/collectionApi', () => ({
  ...jest.requireActual('../../api/collectionApi'),
  renameCollectionApi:jest.fn(), fetchCatalogApi:jest.fn(), fetchUserCollectionsApi:jest.fn(), fetchCollectionSummaryApi:jest.fn(), claimStarterGiftApi:jest.fn(),
  fetchStarterGiftStatusApi:jest.fn(async () => 'claimed'),
}));
const user = {id:'edit-owner',name:'Tester',email:'edit@example.com'};
const hippo: CatalogAnimal = {id:'hippo',code:'hippopotamus',name:'Hippopotamus',category:'Zoo',catalogOrder:1,isCaught:true,caughtCount:2,isFavorite:false};
const fish: UserCollectionItem = {id:'fish-id',userId:user.id,name:'Goldfish',identifiedSpecies:'Goldfish',animalSpecies:'Goldfish',animalType:'Fish',category:'Wild',photoUrl:'/api/v1/storage/photos/fish.jpg',story:'Fish story',favFood:'',temperament:'',isFavorite:false,source:'capture'};
beforeEach(() => {
  jest.clearAllMocks(); appStorage.clearAll();
  useAuthStore.setState({user,tokens:{accessToken:'session'},isAuthenticated:true});
  useCollectionStore.setState({ownerId:user.id,catalog:[hippo],collections:[{...fish}],isLoading:false,isSyncing:false});
});

it('shows only real records even if catalog flags were cached incorrectly', () => {
  const grid = useCollectionStore.getState().getGalleryGrid();
  expect(grid.filter(item => !item.isLocked)).toHaveLength(1);
  expect(grid.find(item => item.id==='hippo')?.isLocked).toBe(true);
});

it('resolves the requested card ID before a different card with that nickname', () => {
  useCollectionStore.setState({collections:[{...fish,id:'first-card',name:'second-card'},{...fish,id:'second-card',name:'Actual Second Card'}]});
  expect(useCollectionStore.getState().getAnimalById('second-card')?.name).toBe('Actual Second Card');
});

it('persists a nickname without changing the photo, species, ID or number of cards', async () => {
  useCollectionStore.setState({collections:[{...fish,localPhotoUri:'file:///documents/captures/fish.jpg'}]});
  jest.mocked(renameCollectionApi).mockResolvedValue({...fish,name:'Hippopotamus'});
  await useCollectionStore.getState().renameCollection(fish.id,'  Hippopotamus  ');
  expect(renameCollectionApi).toHaveBeenCalledWith(fish.id,'Hippopotamus');
  const cards = useCollectionStore.getState().getGalleryGrid().filter(item=>!item.isLocked);
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({id:fish.id,name:'Hippopotamus',species:'Goldfish',animalType:'Fish'});
  expect(useCollectionStore.getState().collections[0].localPhotoUri).toBe('file:///documents/captures/fish.jpg');
  useCollectionStore.setState({collections:[]});
  useCollectionStore.getState().hydrateForUser(user.id);
  expect(useCollectionStore.getState().getAnimalById(fish.id)?.name).toBe('Hippopotamus');
});

it('edits an offline pending card without creating a second record or sending a request', async () => {
  useCollectionStore.setState({collections:[{...fish,id:'local_coll_fish',syncStatus:'pending'}]});
  await useCollectionStore.getState().renameCollection('local_coll_fish','ปลาอ้วนๆ');
  expect(renameCollectionApi).not.toHaveBeenCalled();
  expect(readCollectionCache(user.id,[]).collections).toHaveLength(1);
  expect(readCollectionCache(user.id,[]).collections[0]).toMatchObject({id:'local_coll_fish',name:'ปลาอ้วนๆ',identifiedSpecies:'Goldfish',syncStatus:'pending'});
});

it('keeps the original confirmed name on server failure', async () => {
  jest.mocked(renameCollectionApi).mockRejectedValue(new Error('offline'));
  await expect(useCollectionStore.getState().renameCollection(fish.id,'New Name')).rejects.toThrow('offline');
  expect(useCollectionStore.getState().collections[0].name).toBe('Goldfish');
});

it('shows the new name before the server responds and keeps it through an album refresh', async () => {
  let finish!:(card:UserCollectionItem)=>void;
  jest.mocked(renameCollectionApi).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const pending=useCollectionStore.getState().renameCollection(fish.id,'Instant Name');
  expect(useCollectionStore.getState().getAnimalById(fish.id)?.name).toBe('Instant Name');
  expect(useCollectionStore.getState().collections[0].name).toBe('Goldfish');
  jest.mocked(fetchCatalogApi).mockResolvedValue([hippo]);
  jest.mocked(fetchUserCollectionsApi).mockResolvedValue([fish]);
  jest.mocked(fetchCollectionSummaryApi).mockResolvedValue(null);
  await useCollectionStore.getState().loadCollections();
  expect(useCollectionStore.getState().getAnimalById(fish.id)?.name).toBe('Instant Name');
  expect(readCollectionCache(user.id,[]).collections[0].name).toBe('Goldfish');
  await expect(useCollectionStore.getState().renameCollection(fish.id,'Another Name')).rejects.toThrow('finish saving');
  finish({...fish,name:'Instant Name'});
  await pending;
  expect(readCollectionCache(user.id,[]).collections[0].name).toBe('Instant Name');
  expect(useCollectionStore.getState().pendingNames).toEqual({});
});

it('removes the optimistic name on failure while preserving other confirmed changes', async () => {
  let fail!:(error:Error)=>void;
  jest.mocked(renameCollectionApi).mockImplementationOnce(()=>new Promise((_,reject)=>{fail=reject;}));
  const pending=useCollectionStore.getState().renameCollection(fish.id,'Instant Name');
  const check=expect(pending).rejects.toThrow('offline');
  useCollectionStore.setState({collections:[{...fish,isFavorite:true}]});
  expect(useCollectionStore.getState().getAnimalById(fish.id)?.name).toBe('Instant Name');
  fail(new Error('offline'));
  await check;
  expect(useCollectionStore.getState().getAnimalById(fish.id)).toMatchObject({name:'Goldfish',isFavorite:true});
  expect(useCollectionStore.getState().pendingNames).toEqual({});
});

it('ignores an old rename after switching accounts and returning to the original account', async () => {
  let finish!:(card:UserCollectionItem)=>void;
  jest.mocked(renameCollectionApi).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const pending=useCollectionStore.getState().renameCollection(fish.id,'Old Request');
  const check=expect(pending).rejects.toThrow('account changed');
  useAuthStore.setState({user:{id:'other-account',name:'Other',email:'other@example.com'}});
  useAuthStore.setState({user});
  finish({...fish,name:'Old Request'});
  await check;
  expect(useCollectionStore.getState().getAnimalById(fish.id)?.name).toBe('Goldfish');
  expect(useCollectionStore.getState().pendingNames).toEqual({});
});

it('rejects invalid names before calling the API', async () => {
  for (const name of ['  ','x'.repeat(101),'two\nlines']) {
    await expect(useCollectionStore.getState().renameCollection(fish.id,name)).rejects.toThrow();
  }
  expect(renameCollectionApi).not.toHaveBeenCalled();
});

it.each(['Hippopotamus','My Hippo'])('corrects identification with the appropriate display name: %s', async (name) => {
  const card = {...fish,id:'local_coll_hippo',name,animalId:hippo.id,animalSpecies:'Hippopotamus',identifiedSpecies:'Hippopotamus'};
  useCollectionStore.setState({collections:[card]});
  await useCollectionStore.getState().updateIdentification(card.id,{identifiedSpecies:'Goldfish',animalType:'Fish',habitatTags:['aquatic']});
  const cards = useCollectionStore.getState().getGalleryGrid().filter(item=>!item.isLocked);
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({id:card.id,name:name==='Hippopotamus'?'Goldfish':name,species:'Goldfish',animalType:'Fish'});
});

it('keeps two distinct real captures of the same species when one is renamed', async () => {
  useCollectionStore.setState({collections:[{...fish,id:'local_coll_first'},{...fish,id:'local_coll_second'}]});
  await useCollectionStore.getState().renameCollection('local_coll_first','First Fish');
  expect(useCollectionStore.getState().getGalleryGrid().filter(item=>!item.isLocked).map(item=>item.name)).toEqual(['First Fish','Goldfish']);
});

it('renders one copy of a capture when both its local and server versions are cached', () => {
  const requestId='12345678-1234-4234-8234-123456789abc';
  useCollectionStore.setState({collections:[{...fish,id:`local_coll_${requestId}`,clientRequestId:requestId},{...fish,id:requestId,name:'Confirmed Name'}]});
  const cards=useCollectionStore.getState().getGalleryGrid().filter(item=>!item.isLocked);
  expect(cards).toHaveLength(1);
  expect(cards[0]).toMatchObject({id:requestId,name:'Confirmed Name'});
});

it('does not apply a delayed rename to another account', async () => {
  let finish!: (card:UserCollectionItem)=>void;
  jest.mocked(renameCollectionApi).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const pending=useCollectionStore.getState().renameCollection(fish.id,'New Name');
  const check=expect(pending).rejects.toThrow('account changed');
  useAuthStore.setState({user:{id:'another',name:'Other',email:'other@example.com'}});
  finish({...fish,name:'New Name'});
  await check;
  expect(useCollectionStore.getState().collections).toHaveLength(0);
});

it('discards an older album response after a name was successfully saved', async () => {
  let finish!: (cards:UserCollectionItem[])=>void;
  let started!: ()=>void;
  const requested = new Promise<void>(resolve=>{started=resolve;});
  jest.mocked(fetchCatalogApi).mockResolvedValue([hippo]);
  jest.mocked(fetchCollectionSummaryApi).mockResolvedValue(null);
  jest.mocked(fetchUserCollectionsApi).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;started();}));
  const loading=useCollectionStore.getState().loadCollections();
  await requested;
  jest.mocked(renameCollectionApi).mockResolvedValue({...fish,name:'New Name'});
  await useCollectionStore.getState().renameCollection(fish.id,'New Name');
  finish([fish]);
  await loading;
  expect(useCollectionStore.getState().getAnimalById(fish.id)?.name).toBe('New Name');
  expect(useCollectionStore.getState().isLoading).toBe(false);
});

it('confirms a pending gift before renaming and keeps the original screen lookup working', async () => {
  const localId='local_coll_starter_gift';
  const gift:UserCollectionItem={...fish,id:'server-gift',name:'Hippopotamus',identifiedSpecies:'Hippopotamus',animalSpecies:'Hippopotamus',animalId:hippo.id,animalCode:hippo.code,source:'starter_gift'};
  appStorage.set('starterGiftClaimed','true');
  appStorage.set('starterGiftOwner',user.id);
  useCollectionStore.setState({collections:[{...gift,id:localId}]});
  jest.mocked(fetchCatalogApi).mockResolvedValue([hippo]);
  jest.mocked(fetchCollectionSummaryApi).mockResolvedValue(null);
  jest.mocked(fetchUserCollectionsApi).mockResolvedValue([]);
  jest.mocked(claimStarterGiftApi).mockResolvedValue(gift);
  jest.mocked(renameCollectionApi).mockResolvedValue({...gift,name:'หมูเด้ง'});
  await useCollectionStore.getState().renameCollection(localId,'หมูเด้ง');
  expect(renameCollectionApi).toHaveBeenCalledWith(gift.id,'หมูเด้ง',expect.any(Number));
  expect(fetchUserCollectionsApi).not.toHaveBeenCalled();
  expect(fetchCatalogApi).not.toHaveBeenCalled();
  expect(useCollectionStore.getState().collections).toHaveLength(1);
  expect(useCollectionStore.getState().getAnimalById(localId)?.name).toBe('หมูเด้ง');
});
