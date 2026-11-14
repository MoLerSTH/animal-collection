import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../auth/stores/useAuthStore';
import {
  AnalysisCancelledError,
  AnimalAnalysisError,
  AnimalIdentification,
  identifyAnimalApi,
} from '../api/identifyAnimalApi';
import { useAnalysisCooldownStore } from '../stores/useAnalysisCooldownStore';

export type IdentificationStatus = 'idle' | 'analyzing' | 'identified' | 'not_found' | 'error';

export interface UseAnimalIdentificationResult {
  status: IdentificationStatus;
  result: AnimalIdentification | null;
  errorMessage: string;
  errorHint: string;
  requiresSignIn: boolean;
  retry: () => void;
  cancel: () => void;
}

function formatAnalysisError(analysisError: unknown) {
  const expiredSession =
    analysisError instanceof AnimalAnalysisError &&
    (analysisError.status === 401 || analysisError.status === 403);
  const errorMessage =
    analysisError instanceof Error
      ? analysisError.message
      : 'Animal analysis is unavailable. Please try again.';
  const quota = analysisError instanceof AnimalAnalysisError ? analysisError.quota : undefined;
  const dailyReset =
    (quota?.code?.endsWith('_daily_limit') || quota?.code?.endsWith('_weekly_limit')) &&
    quota.resetsAt;
  const errorHint = expiredSession
    ? 'Sign in to connect your account to the analysis service.'
    : dailyReset
      ? `Try again after ${new Date(dailyReset).toLocaleString('en-GB', {
          timeZone: 'Asia/Bangkok',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })} Thailand time.`
      : quota?.code
        ? 'This rejected request did not use your daily allowance. Wait for the timer before trying again.'
        : 'Your photo was captured, but could not be analyzed.';

  return { expiredSession, errorMessage, errorHint, quota };
}

/**
 * Runs background animal identification for a captured photo while guarding
 * against unmounts, explicit cancellation, and account switches.
 */
export function useAnimalIdentification(params: {
  imageUri?: string;
  enabled: boolean;
  captureOwner?: string;
}): UseAnimalIdentificationResult {
  const { imageUri, enabled, captureOwner } = params;
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [attempt, setAttempt] = useState(0);
  const [cancelled, setCancelled] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const canAnalyze = Boolean(enabled && imageUri && !cancelled && currentUserId === captureOwner);
  const [status, setStatus] = useState<IdentificationStatus>(canAnalyze ? 'analyzing' : 'idle');
  const [result, setResult] = useState<AnimalIdentification | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorHint, setErrorHint] = useState('');
  const [requiresSignIn, setRequiresSignIn] = useState(false);

  const resetFields = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setErrorMessage('');
    setErrorHint('');
    setRequiresSignIn(false);
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setCancelled(true);
    resetFields();
  }, [resetFields]);

  const retry = useCallback(() => {
    setCancelled(false);
    setAttempt((count) => count + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !imageUri || cancelled || currentUserId !== captureOwner) {
      controllerRef.current?.abort();
      controllerRef.current = null;
      resetFields();
      return;
    }

    let active = true;
    const controller = new AbortController();
    controllerRef.current = controller;

    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.user?.id !== captureOwner) {
        active = false;
        controller.abort();
      }
    });

    setStatus('analyzing');
    setResult(null);
    setErrorMessage('');
    setErrorHint('');
    setRequiresSignIn(false);

    const token = useAuthStore.getState().tokens?.accessToken;

    void (async () => {
      try {
        const identification = await identifyAnimalApi(imageUri, token, {
          signal: controller.signal,
        });
        if (!active || controller.signal.aborted || useAuthStore.getState().user?.id !== captureOwner) {
          return;
        }
        if (!identification.found) {
          setStatus('not_found');
          setResult(null);
          setErrorMessage('No animal found - Try another photo');
          setErrorHint('Move closer and keep the animal in focus.');
          setRequiresSignIn(false);
          return;
        }
        setStatus('identified');
        setResult(identification);
        setErrorMessage('');
        setErrorHint('');
        setRequiresSignIn(false);
      } catch (analysisError) {
        if (analysisError instanceof AnalysisCancelledError || controller.signal.aborted) {
          return;
        }
        if (!active || useAuthStore.getState().user?.id !== captureOwner) {
          return;
        }
        const formatted = formatAnalysisError(analysisError);
        if (formatted.quota?.retryAfterSeconds) {
          useAnalysisCooldownStore
            .getState()
            .setCooldown(formatted.quota.retryAfterSeconds, captureOwner);
        }
        setRequiresSignIn(formatted.expiredSession);
        setErrorMessage(formatted.errorMessage);
        setErrorHint(formatted.errorHint);
        setResult(null);
        setStatus('error');
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    })();

    return () => {
      active = false;
      controller.abort();
      unsubscribe();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [imageUri, enabled, captureOwner, attempt, cancelled, currentUserId, resetFields]);

  return {
    status,
    result,
    errorMessage,
    errorHint,
    requiresSignIn,
    retry,
    cancel,
  };
}
