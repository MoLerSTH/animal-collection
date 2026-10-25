import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrivateImage, isPrivatePhoto } from './PrivateImage';
import { colors, typography } from './Design';
import AppIcon from './AppIcon';
import { Skeleton } from './Skeleton';

/** Gallery previews leave the original URI in the collection/detail untouched. */
export function galleryPhotoUrl(uri: string) {
  return isPrivatePhoto(uri) ? `${uri}${uri.includes('?') ? '&' : '?'}variant=thumbnail` : uri;
}

export default function GalleryPhoto({uri, name}: {uri: string | null; name: string}) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(uri ? 'loading' : 'error');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { setStatus(uri ? 'loading' : 'error'); }, [uri]);

  return (
    <View style={styles.frame}>
      {!!uri && (
        <PrivateImage
          key={attempt}
          source={{uri: galleryPhotoUrl(uri)}}
          accessibilityLabel={`${name} photo`}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoadStart={() => setStatus('loading')}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
      {status === 'loading' && (
        <View style={styles.overlay} accessible accessibilityRole="progressbar" accessibilityLabel={`Loading photo of ${name}`}>
          <Skeleton width="100%" height="100%" borderRadius={0} accessible={false} style={StyleSheet.absoluteFill} />
        </View>
      )}
      {status === 'error' && (
        <View style={styles.overlay}>
          <AppIcon name="paw" size={30} color="#A47A5C"/>
          <Text style={styles.label}>Photo unavailable</Text>
          {!!uri && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Retry photo of ${name}`}
              hitSlop={8}
              onPress={event => {
                event.stopPropagation();
                setStatus('loading');
                setAttempt(value => value + 1);
              }}
            >
              <Text style={styles.retry}>Retry photo</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F7EFE6',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7EFE6',
  },
  label: {
    fontFamily: typography.regular,
    fontSize: 11,
    color: '#765746',
    textAlign: 'center',
  },
  retry: {
    fontFamily: typography.bold,
    fontSize: 12,

    color: colors.ink,
    padding: 4,
  },
});
