import { renameCollectionApi, NameSaveTimeoutError, claimStarterGiftApi } from '../collectionApi';
import { authenticatedFetch } from '../../../../core/api/authenticatedFetch';

jest.mock('../../../../core/api/authenticatedFetch',()=>({authenticatedFetch:jest.fn()}));
const reply = (data:unknown) => ({ok:true,status:200,json:async()=>data,headers:{get:()=>null}} as unknown as Response);
beforeEach(()=>{jest.clearAllMocks();jest.useFakeTimers();});
afterEach(()=>{jest.useRealTimers();});

it('uses the small name-only endpoint and clears its deadline after success', async()=>{
  jest.mocked(authenticatedFetch).mockResolvedValue(reply({id:'card',name:'New Name'}));
  await expect(renameCollectionApi('card','New Name')).resolves.toEqual({id:'card',name:'New Name'});
  expect(authenticatedFetch).toHaveBeenCalledWith(expect.stringContaining('/collections/card/name'),expect.objectContaining({method:'PATCH',body:JSON.stringify({name:'New Name'})}));
  expect(jest.getTimerCount()).toBe(0);
});

it('stops waiting after eight seconds even if network or session refresh ignores abort', async()=>{
  jest.mocked(authenticatedFetch).mockImplementation(()=>new Promise(()=>{}));
  const check=expect(renameCollectionApi('card','New Name')).rejects.toBeInstanceOf(NameSaveTimeoutError);
  await jest.advanceTimersByTimeAsync(8000);
  await check;
  expect(jest.mocked(authenticatedFetch).mock.calls[0][1]?.signal?.aborted).toBe(true);
});

it('includes response body parsing in the eight second budget', async()=>{
  jest.mocked(authenticatedFetch).mockResolvedValue({...reply(null),json:()=>new Promise(()=>{})});
  const check=expect(renameCollectionApi('card','New Name')).rejects.toBeInstanceOf(NameSaveTimeoutError);
  await jest.advanceTimersByTimeAsync(8000);
  await check;
});

it('uses the remaining budget after confirming a pending gift', async()=>{
  jest.mocked(authenticatedFetch).mockImplementation(()=>new Promise(()=>{}));
  const check=expect(renameCollectionApi('card','New Name',1200)).rejects.toBeInstanceOf(NameSaveTimeoutError);
  await jest.advanceTimersByTimeAsync(1200);
  await check;
});

it('bounds direct gift claims without loading the whole album', async()=>{
  jest.mocked(authenticatedFetch).mockImplementation(()=>new Promise(()=>{}));
  const check=expect(claimStarterGiftApi(true)).rejects.toBeInstanceOf(NameSaveTimeoutError);
  await jest.advanceTimersByTimeAsync(8000);
  await check;
  expect(authenticatedFetch).toHaveBeenCalledTimes(1);
});

it('rejects a mismatched card response', async()=>{
  jest.mocked(authenticatedFetch).mockResolvedValue(reply({id:'another-card',name:'New Name'}));
  await expect(renameCollectionApi('card','New Name')).rejects.toThrow('Invalid card name response');
});
