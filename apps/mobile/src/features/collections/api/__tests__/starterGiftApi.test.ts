import { fetchStarterGiftStatusApi } from '../collectionApi';
import { authenticatedFetch } from '../../../../core/api/authenticatedFetch';

jest.mock('../../../../core/api/authenticatedFetch', () => ({authenticatedFetch: jest.fn()}));
beforeEach(() => jest.clearAllMocks());

it.each(['available', 'claimed', 'removed'] as const)('reads %s entitlement without claiming a gift', async status => {
  jest.mocked(authenticatedFetch).mockResolvedValue({ok: true, status: 200, json: async () => ({status})} as Response);
  await expect(fetchStarterGiftStatusApi('session')).resolves.toBe(status);
  expect(authenticatedFetch).toHaveBeenCalledWith(expect.stringContaining('/collections/starter-gift'),
    expect.objectContaining({method: 'GET', headers: {Authorization: 'Bearer session'}}));
});

it('does not interpret a failed entitlement request as permission to claim', async () => {
  jest.mocked(authenticatedFetch).mockResolvedValue({ok: false, status: 401} as Response);
  await expect(fetchStarterGiftStatusApi('session')).rejects.toThrow('Could not check');
});

it('rejects a malformed entitlement response', async () => {
  jest.mocked(authenticatedFetch).mockResolvedValue({ok: true, status: 200, json: async () => ({})} as Response);
  await expect(fetchStarterGiftStatusApi('session')).rejects.toThrow('Invalid starter gift status');
});
