import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle, DimensionValue, Easing } from 'react-native';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessible?: boolean;
}

/**
 * Atomic Skeleton primitive.
 * Smooth, warm, minimal waving color effect for perceived speed and fluid UX.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  testID = 'skeleton-loader',
  accessibilityLabel = 'Loading content…',
  accessible = true,
}: SkeletonProps) {
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [waveAnim]);

  const waveOpacity = waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.9],
  });

  return (
    <View
      testID={testID}
      accessible={accessible}
      accessibilityRole={accessible ? 'progressbar' : undefined}
      accessibilityLabel={accessible ? accessibilityLabel : undefined}
      style={[
        styles.skeletonBase,
        {
          width,
          height,
          borderRadius,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.skeletonWave,
          {
            borderRadius,
            opacity: waveOpacity,
          },
        ]}
      />
    </View>
  );
}

/**
 * Skeleton collectible card matching the GalleryScreen card layout.
 */
export function SkeletonCard() {
  return (
    <View style={styles.cardContainer}>
      {/* Photo Placeholder */}
      <Skeleton width="100%" height="100%" borderRadius={0} style={styles.cardPhoto} />
      {/* Content Placeholders */}
      <View style={styles.cardBody}>
        <Skeleton width="75%" height={14} borderRadius={6} />
        <Skeleton width="50%" height={11} borderRadius={4} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

/**
 * 2-column Skeleton Grid for GalleryScreen initial load.
 */
export function SkeletonGalleryGrid({ count = 4 }: { count?: number }) {
  const items = Array.from({ length: count }, (_, i) => i);
  return (
    <View testID="skeleton-gallery-grid" style={styles.gridContainer}>
      {items.map((key) => (
        <View key={key} style={styles.gridColumn}>
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton for AnimalDetailScreen loading states.
 */
export function SkeletonDetail() {
  return (
    <View testID="skeleton-detail" style={styles.detailContainer}>
      {/* Hero photo skeleton */}
      <Skeleton width="100%" height={320} borderRadius={24} style={styles.heroSkeleton} />

      {/* Title & subtitle skeleton */}
      <View style={{ gap: 8 }}>
        <Skeleton width="65%" height={26} borderRadius={8} />
        <Skeleton width="35%" height={14} borderRadius={6} />
      </View>

      {/* Bento grid skeleton */}
      <View style={styles.detailBentoRow}>
        <View style={styles.detailBentoCard}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width="40%" height={10} borderRadius={4} />
            <Skeleton width="80%" height={13} borderRadius={5} />
          </View>
        </View>
        <View style={styles.detailBentoCard}>
          <Skeleton width={32} height={32} borderRadius={16} />
          <View style={{ flex: 1, gap: 4 }}>
            <Skeleton width="40%" height={10} borderRadius={4} />
            <Skeleton width="80%" height={13} borderRadius={5} />
          </View>
        </View>
      </View>

      {/* Field notes card skeleton */}
      <View style={styles.detailNotesCard}>
        <Skeleton width="45%" height={15} borderRadius={6} />
        <Skeleton width="100%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
        <Skeleton width="90%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
        <Skeleton width="70%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

/**
 * Skeleton for UserProfileScreen loading states.
 */
export function SkeletonProfile() {
  return (
    <View testID="skeleton-profile" style={styles.profileContainer}>
      {/* Avatar skeleton */}
      <View style={{ alignItems: 'center', marginVertical: 12 }}>
        <Skeleton width={96} height={96} borderRadius={48} />
        <Skeleton width={140} height={20} borderRadius={8} style={{ marginTop: 12 }} />
        <Skeleton width={90} height={13} borderRadius={6} style={{ marginTop: 6 }} />
      </View>

      {/* Stats pill skeleton */}
      <View style={styles.profileStatsRow}>
        <View style={styles.profileStatItem}>
          <Skeleton width={36} height={22} borderRadius={6} />
          <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.profileStatItem}>
          <Skeleton width={36} height={22} borderRadius={6} />
          <Skeleton width={60} height={11} borderRadius={4} style={{ marginTop: 4 }} />
        </View>
      </View>

      {/* Badges section skeleton */}
      <View style={{ gap: 10, marginTop: 8 }}>
        <Skeleton width="50%" height={18} borderRadius={6} />
        <View style={styles.profileBadgesGrid}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={styles.badgeSkeletonCard}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <Skeleton width="80%" height={10} borderRadius={4} style={{ marginTop: 6 }} />
              <Skeleton width="50%" height={8} borderRadius={3} style={{ marginTop: 4 }} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: '#EBE3D7', // Base warm minimal sand tone
    overflow: 'hidden',
  },
  skeletonWave: {
    backgroundColor: '#FAF5ED', // Smooth waving warm cream glow
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.06)',
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPhoto: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#E6DDD0',
  },
  cardBody: {
    padding: 10,
    gap: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  gridColumn: {
    width: '48.5%',
    marginBottom: 12,
  },
  detailContainer: {
    gap: 16,
    paddingVertical: 8,
  },
  heroSkeleton: {
    backgroundColor: '#E6DDD0',
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  detailBentoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailBentoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.07)',
  },
  detailNotesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.07)',
  },
  profileContainer: {
    gap: 16,
    paddingVertical: 8,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.07)',
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeSkeletonCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.07)',
  },
});
