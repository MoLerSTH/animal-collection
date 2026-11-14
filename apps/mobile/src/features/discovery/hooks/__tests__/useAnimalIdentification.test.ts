import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../../../auth/stores/useAuthStore';
import {
  AnalysisCancelledError,
  AnimalAnalysisError,
  AnimalIdentification,
  identifyAnimalApi,
} from '../../api/identifyAnimalApi';
import { useAnalysisCooldownStore } from '../../stores/useAnalysisCooldownStore';
import { useAnimalIdentification } from '../useAnimalIdentification';

jest.mock('../../api/identifyAnimalApi', () => {
  const actual = jest.requireActual('../../api/identifyAnimalApi');
  return {
    ...actual,
    identifyAnimalApi: jest.fn(),
  };
});

const mockIdentifyAnimalApi = jest.mocked(identifyAnimalApi);

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAnimalIdentification', () => {
  const originalAuthState = {
    user: useAuthStore.getState().user,
    tokens: useAuthStore.getState().tokens,
    isAuthenticated: useAuthStore.getState().isAuthenticated,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAnalysisCooldownStore.setState({ ownerId: undefined, retryUntil: 0 });
    useAuthStore.setState({
      user: { id: 'user-a', name: 'Alice', email: 'alice@example.com' },
      tokens: { accessToken: 'token-a' },
      isAuthenticated: true,
    });
  });

  afterEach(() => {
    cleanup();
    useAuthStore.setState(originalAuthState);
    useAnalysisCooldownStore.setState({ ownerId: undefined, retryUntil: 0 });
  });

  it('starts in analyzing state on mount when enabled and resolves to identified with metadata', async () => {
    const deferred = createDeferred<AnimalIdentification>();
    mockIdentifyAnimalApi.mockReturnValueOnce(deferred.promise);

    const { result } = renderHook(() =>
      useAnimalIdentification({
        imageUri: 'file:///captures/otter.jpg',
        enabled: true,
        captureOwner: 'user-a',
      }),
    );

    expect(result.current.status).toBe('analyzing');
    expect(result.current.result).toBeNull();
    expect(mockIdentifyAnimalApi).toHaveBeenCalledWith(
      'file:///captures/otter.jpg',
      'token-a',
      { signal: expect.any(AbortSignal) },
    );

    const identification: AnimalIdentification = {
      found: true,
      species: 'Sea Otter',
      story: 'A coastal marine mammal that uses rocks as tools.',
      animalType: 'Mammal',
      habitatTags: ['aquatic'],
    };

    await act(async () => {
      deferred.resolve(identification);
      await deferred.promise;
    });

    expect(result.current.status).toBe('identified');
    expect(result.current.result).toEqual(identification);
    expect(result.current.errorMessage).toBe('');
    expect(result.current.errorHint).toBe('');
    expect(result.current.requiresSignIn).toBe(false);
  });

  it('stays idle and does not call identifyAnimalApi when enabled is false', () => {
    const { result } = renderHook(() =>
      useAnimalIdentification({
        imageUri: 'file:///captures/manual.jpg',
        enabled: false,
        captureOwner: 'user-a',
      }),
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.errorMessage).toBe('');
    expect(result.current.errorHint).toBe('');
    expect(result.current.requiresSignIn).toBe(false);
    expect(mockIdentifyAnimalApi).not.toHaveBeenCalled();
  });

  it('transitions to not_found when identification returns found: false', async () => {
    mockIdentifyAnimalApi.mockResolvedValueOnce({
      found: false,
      species: '',
      story: '',
    });

    const { result } = renderHook(() =>
      useAnimalIdentification({
        imageUri: 'file:///captures/blurry.jpg',
        enabled: true,
        captureOwner: 'user-a',
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('not_found');
    });

    expect(result.current.result).toBeNull();
    expect(result.current.errorMessage).toBe('No animal found - Try another photo');
    expect(result.current.errorHint).toBe('Move closer and keep the animal in focus.');
    expect(result.current.requiresSignIn).toBe(false);
  });

  it('updates useAnalysisCooldownStore on 429, sets allowance hint, and re-runs on retry()', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(50_000);
    try {
      mockIdentifyAnimalApi
        .mockRejectedValueOnce(
          new AnimalAnalysisError(
            'The analysis service is busy. Please wait a moment.',
            429,
            { code: 'service_busy', retryAfterSeconds: 30 },
          ),
        )
        .mockResolvedValueOnce({
          found: true,
          species: 'Red Fox',
          story: 'An adaptable woodland mammal.',
          animalType: 'Mammal',
          habitatTags: ['mountain'],
        });

      const { result } = renderHook(() =>
        useAnimalIdentification({
          imageUri: 'file:///captures/fox.jpg',
          enabled: true,
          captureOwner: 'user-a',
        }),
      );

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(result.current.errorMessage).toBe('The analysis service is busy. Please wait a moment.');
      expect(result.current.errorHint).toBe(
        'This rejected request did not use your daily allowance. Wait for the timer before trying again.',
      );
      expect(result.current.requiresSignIn).toBe(false);
      expect(useAnalysisCooldownStore.getState().retryUntil).toBe(80_000);
      expect(useAnalysisCooldownStore.getState().ownerId).toBe('user-a');

      await act(async () => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('identified');
      });

      expect(mockIdentifyAnimalApi).toHaveBeenCalledTimes(2);
      expect(mockIdentifyAnimalApi).toHaveBeenNthCalledWith(
        2,
        'file:///captures/fox.jpg',
        'token-a',
        { signal: expect.any(AbortSignal) },
      );
      expect(result.current.result?.species).toBe('Red Fox');
      expect(result.current.errorMessage).toBe('');
      expect(result.current.errorHint).toBe('');
    } finally {
      nowSpy.mockRestore();
    }
  });

  it('formats Bangkok reset time hint for daily/weekly quota limits', async () => {
    const resetsAt = '2026-10-24T07:00:00Z';
    const expectedBangkok = new Date(resetsAt).toLocaleString('en-GB', {
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    mockIdentifyAnimalApi.mockRejectedValueOnce(
      new AnimalAnalysisError(
        'You have used today’s analysis allowance.',
        429,
        { code: 'user_daily_limit', retryAfterSeconds: 3600, resetsAt },
      ),
    );

    const { result } = renderHook(() =>
      useAnimalIdentification({
        imageUri: 'file:///captures/owl.jpg',
        enabled: true,
        captureOwner: 'user-a',
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });

    expect(result.current.errorHint).toBe(`Try again after ${expectedBangkok} Thailand time.`);
  });

  it.each([401, 403])(
    'sets requiresSignIn and sign-in hint on HTTP %s',
    async (status) => {
      mockIdentifyAnimalApi.mockRejectedValueOnce(
        new AnimalAnalysisError('Please sign in again before analyzing a photo.', status),
      );

      const { result } = renderHook(() =>
        useAnimalIdentification({
          imageUri: 'file:///captures/koi.jpg',
          enabled: true,
          captureOwner: 'user-a',
        }),
      );

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(result.current.requiresSignIn).toBe(true);
      expect(result.current.errorMessage).toBe('Please sign in again before analyzing a photo.');
      expect(result.current.errorHint).toBe('Sign in to connect your account to the analysis service.');
    },
  );

  it('aborts request and discards response cleanly on account switch while pending', async () => {
    const deferred = createDeferred<AnimalIdentification>();
    let capturedSignal: AbortSignal | undefined;
    mockIdentifyAnimalApi.mockImplementationOnce((_uri, _token, options) => {
      capturedSignal = options?.signal;
      return deferred.promise;
    });

    const { result } = renderHook(() =>
      useAnimalIdentification({
        imageUri: 'file:///captures/crane.jpg',
        enabled: true,
        captureOwner: 'user-a',
      }),
    );

    expect(result.current.status).toBe('analyzing');
    expect(capturedSignal?.aborted).toBe(false);

    act(() => {
      useAuthStore.setState({
        user: { id: 'other-user', name: 'Other', email: 'other@example.com' },
        tokens: { accessToken: 'token-b' },
      });
    });

    expect(capturedSignal?.aborted).toBe(true);

    await act(async () => {
      deferred.reject(
        new AnimalAnalysisError('Too many requests', 429, {
          code: 'service_busy',
          retryAfterSeconds: 60,
        }),
      );
      await deferred.promise.catch(() => {});
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(useAnalysisCooldownStore.getState().retryUntil).toBe(0);
  });

  it('aborts request and discards response cleanly on unmount', async () => {
    const deferred = createDeferred<AnimalIdentification>();
    let capturedSignal: AbortSignal | undefined;
    mockIdentifyAnimalApi.mockImplementationOnce((_uri, _token, options) => {
      capturedSignal = options?.signal;
      return deferred.promise;
    });

    const { unmount } = renderHook(() =>
      useAnimalIdentification({
        imageUri: 'file:///captures/heron.jpg',
        enabled: true,
        captureOwner: 'user-a',
      }),
    );

    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);

    await act(async () => {
      deferred.reject(
        new AnimalAnalysisError('Too many requests', 429, {
          code: 'service_busy',
          retryAfterSeconds: 60,
        }),
      );
      await deferred.promise.catch(() => {});
    });

    expect(useAnalysisCooldownStore.getState().retryUntil).toBe(0);
  });

  it('aborts active request and resets to idle when cancel() is called', async () => {
    let capturedSignal: AbortSignal | undefined;
    mockIdentifyAnimalApi.mockImplementationOnce(
      (_uri, _token, options) =>
        new Promise((_resolve, reject) => {
          capturedSignal = options?.signal;
          options?.signal?.addEventListener('abort', () => {
            reject(new AnalysisCancelledError());
          });
        }),
    );

    const { result } = renderHook(() =>
      useAnimalIdentification({
        imageUri: 'file:///captures/lynx.jpg',
        enabled: true,
        captureOwner: 'user-a',
      }),
    );

    expect(result.current.status).toBe('analyzing');

    await act(async () => {
      result.current.cancel();
    });

    expect(capturedSignal?.aborted).toBe(true);
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.errorMessage).toBe('');
    expect(result.current.errorHint).toBe('');
  });
});
