import { useAnalysisCooldownStore } from '../useAnalysisCooldownStore';

describe('useAnalysisCooldownStore', () => {
  beforeEach(() => {
    useAnalysisCooldownStore.setState({ ownerId: undefined, retryUntil: 0 });
  });

  it('stores cooldown end timestamp scoped to ownerId and clears it when owner changes', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(10_000);
    try {
      useAnalysisCooldownStore.getState().setCooldown(30, 'user-a');
      expect(useAnalysisCooldownStore.getState().retryUntil).toBe(40_000);
      expect(useAnalysisCooldownStore.getState().ownerId).toBe('user-a');

      useAnalysisCooldownStore.getState().syncOwner('user-a');
      expect(useAnalysisCooldownStore.getState().retryUntil).toBe(40_000);

      useAnalysisCooldownStore.getState().syncOwner('user-b');
      expect(useAnalysisCooldownStore.getState().retryUntil).toBe(0);
      expect(useAnalysisCooldownStore.getState().ownerId).toBe('user-b');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('ignores non-positive retry durations and clears cooldown on demand', () => {
    useAnalysisCooldownStore.getState().setCooldown(0, 'user-a');
    expect(useAnalysisCooldownStore.getState().retryUntil).toBe(0);
    useAnalysisCooldownStore.getState().setCooldown(5, 'user-a');
    useAnalysisCooldownStore.getState().clearCooldown();
    expect(useAnalysisCooldownStore.getState().retryUntil).toBe(0);
  });
});
