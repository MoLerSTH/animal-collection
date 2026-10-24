import React, { useEffect, useRef } from 'react';
import { Image, ImageProps, ImageURISource } from 'react-native';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import { getApiBaseUrl } from '../../core/api/config';

export function isPrivatePhoto(uri: string) {
  try {
    const url = new URL(uri, getApiBaseUrl());
    return url.origin === new URL(getApiBaseUrl()).origin && url.pathname.startsWith('/api/v1/storage/photos/');
  } catch { return false; }
}

/** Credentials are sent only to our own photo endpoint, never external images. */
export function PrivateImage({source, onError, ...props}: ImageProps) {
  const token = useAuthStore(state => state.tokens?.accessToken);
  const userId = useAuthStore(state => state.user?.id);
  const attempted = useRef(false);
  const session = useRef({token, userId, revision: 0});
  if (session.current.token !== token || session.current.userId !== userId) {
    session.current = {token, userId, revision: session.current.revision + 1};
  }
  const uri = source && !Array.isArray(source) && typeof source === 'object' ? (source as ImageURISource).uri : undefined;
  useEffect(() => { attempted.current = false; }, [uri, userId]);
  const managed = uri && isPrivatePhoto(uri);
  // Android keeps the previous image request when only its headers change.
  // Remount after a session change so an expired token is never reused.
  // Only the revision is used as a key; credentials never enter the URL or key.
  // RN 0.85 Android forwards source headers only for an array of sources.
  return <Image {...props} key={managed ? session.current.revision : undefined}
    source={managed ? [{...source as ImageURISource, cache: 'reload', headers: token ? {Authorization: `Bearer ${token}`} : {}}] : source}
    onError={event => {
      onError?.(event);
      if (managed && !attempted.current && userId) {
        attempted.current = true;
        void useAuthStore.getState().refreshSession().catch(() => {});
      }
    }}/>;
}
