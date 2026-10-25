import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import { useTranslation } from '../../core/i18n/useLanguageStore';
import AppIcon from '../components/AppIcon';
import BadgeArtwork, { BadgeName } from '../components/BadgeArtwork';
import BadgeMissionSheet from '../components/BadgeMissionSheet';
import ProfileStats from '../components/ProfileStats';
import { achievements } from '../data/achievements';
import { colors, Hippo, typography, ui } from '../components/Design';
import { SkeletonProfile } from '../components/Skeleton';
import { PrivateImage as Image } from '../components/PrivateImage';

export default function UserProfileScreen() {
  const user = useAuthStore(state => state.user);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useCollectionStore();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<BadgeName>();

  const { width: windowWidth } = useWindowDimensions();
  const maxContentWidth = 540;
  const isTablet = windowWidth >= 600;
  const numColumns = isTablet ? 4 : 3;
  const gridGap = 10;
  const horizontalPadding = Math.max(16, Math.min(24, Math.floor(windowWidth * 0.045)));
  const availableGridWidth = Math.min(windowWidth - horizontalPadding * 2, maxContentWidth - horizontalPadding * 2);
  const itemWidth = Math.floor((availableGridWidth - (numColumns - 1) * gridGap) / numColumns);

  if (store.isLoading && store.collections.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={ui.page}>
        <SkeletonProfile />
      </SafeAreaView>
    );
  }

  const animals = store.getGalleryGrid().filter(a => !a.isLocked);
  const badges = achievements(store.collections);
  const unlocked = badges.filter(badge => badge.unlocked).length;
  const overallPercentage = Math.round((unlocked / 9) * 100);

  return (
    <SafeAreaView edges={['top']} style={ui.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: horizontalPadding,
            maxWidth: maxContentWidth,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row with Settings Action */}
        <View style={styles.topHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.profile.openSettings}
            onPress={() => nav.navigate('Settings')}
            style={({ pressed }) => [styles.settingsButton, pressed && styles.buttonPressed]}
          >
            <AppIcon name="settings" size={22} color={colors.ink} />
          </Pressable>
        </View>

        {/* Profile Identity Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            {user?.avatarUri ? (
              <Image source={{ uri: user.avatarUri }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <Hippo size={76} />
            )}
          </View>
          <Text style={styles.userName}>{user?.name || 'HippoFan'}</Text>
          <View style={styles.subtitleBadge}>
            <AppIcon name="sprout" size={15} color="#5D7838" />
            <Text style={styles.subtitleText}>{t.profile.subtitle}</Text>
          </View>
        </View>

        {/* Overview Stats Bar */}
        <ProfileStats animalsCollected={animals.length} badgesUnlocked={unlocked} />

        {/* Badges & Achievements Section */}
        <View style={styles.badgesSection}>
          <View style={styles.badgesHeaderRow}>
            <Text style={styles.sectionTitle}>{t.profile.myBadges}</Text>
            <View style={styles.counterBadge}>
              <AppIcon name="crown" size={13} color="#C47A2B" />
              <Text style={styles.counterBadgeText}>{unlocked}/9</Text>
            </View>
          </View>

          {/* Minimal Overall Progress Bar */}
          <View style={styles.overallTrack}>
            <View style={[styles.overallFill, { width: `${overallPercentage}%` }]} />
          </View>
          <Text style={styles.badgeHintText}>{t.profile.badgeHint}</Text>

          {/* Responsive Badges Grid */}
          <View style={[styles.badgesGrid, { gap: gridGap }]}>
            {badges.map(badge => {
              const percent = Math.min(100, Math.round((badge.value / badge.total) * 100));
              return (
                <Pressable
                  key={badge.name}
                  accessibilityRole="button"
                  accessibilityLabel={`${badge.name}, ${badge.unlocked ? t.profile.unlocked : t.profile.locked}, ${badge.value}/${badge.total}. ${t.profile.viewMissions}`}
                  onPress={() => setSelected(badge.name)}
                  style={({ pressed }) => [
                    styles.badgeCard,
                    { width: itemWidth },
                    badge.unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked,
                    pressed && styles.cardPressed,
                  ]}
                >
                  <View style={styles.artworkFrame}>
                    <BadgeArtwork name={badge.name} locked={!badge.unlocked} />
                  </View>
                  <Text style={styles.badgeName} numberOfLines={1}>
                    {badge.name}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      badge.unlocked ? styles.statusPillUnlocked : styles.statusPillLocked,
                    ]}
                  >
                    <Text
                      style={
                        badge.unlocked ? styles.statusTextUnlocked : styles.statusTextLocked
                      }
                    >
                      {badge.unlocked ? t.profile.unlocked : t.profile.locked}
                    </Text>
                  </View>
                  <View style={styles.badgeProgressTrack}>
                    <View
                      style={[
                        styles.badgeProgressFill,
                        {
                          width: `${percent}%`,
                          backgroundColor: badge.unlocked ? '#708A49' : colors.pink,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.badgeCounterText}>
                    {badge.value}/{badge.total}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Warning Banner if cards have missing taxonomy */}
        {store.collections.some(item => !item.animalType || item.animalType === 'Unknown') && (
          <View style={styles.warningBanner}>
            <AppIcon name="paw" size={18} color="#A86E3B" />
            <Text style={styles.warningText}>{t.profile.unknownWarning}</Text>
          </View>
        )}

        {/* How to Play Card */}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.howToPlayCard, pressed && styles.cardPressed]}
          onPress={() => nav.navigate('Onboarding', { review: true })}
        >
          <View style={styles.howToPlayIcon}>
            <AppIcon name="help" color="#8C583E" size={20} />
          </View>
          <View style={styles.howToPlayTextWrapper}>
            <Text style={styles.howToPlayTitle}>{t.settings.howToPlay}</Text>
            <Text style={styles.howToPlaySubtitle}>{t.settings.howToPlaySubtitle}</Text>
          </View>
          <AppIcon name="chevron-right" size={18} color="#A48E7E" />
        </Pressable>
      </ScrollView>

      {/* Badge Mission Detail Sheet Modal */}
      <BadgeMissionSheet
        badge={badges.find(badge => badge.name === selected)}
        onClose={() => setSelected(undefined)}
        onGallery={() => {
          setSelected(undefined);
          nav.navigate('MainTabs', { screen: 'Gallery' });
        }}
        onCapture={() => {
          setSelected(undefined);
          nav.navigate('MainTabs', { screen: 'Catch' });
        }}
        onOpenCollection={id => {
          setSelected(undefined);
          nav.navigate('AnimalDetail', { animalId: id });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 4,
    paddingBottom: 110,
    gap: 16,
    width: '100%',
    alignSelf: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '100%',
    paddingTop: 4,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.92 }],
    opacity: 0.85,
  },
  profileCard: {
    alignItems: 'center',
    gap: 10,
    marginTop: -8,
    marginBottom: 2,
  },
  avatarCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontFamily: typography.extraBold,
    fontSize: 24,
    color: colors.ink,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF5EC',
    borderWidth: 1,
    borderColor: '#F2DECF',
    paddingVertical: 5,
    paddingHorizontal: 13,
    borderRadius: 16,
  },
  subtitleText: {
    fontFamily: typography.medium,
    fontSize: 12,
    color: '#826857',
  },
  badgesSection: {
    gap: 10,
    marginTop: 4,
  },
  badgesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: typography.bold,
    fontSize: 18,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  counterBadgeText: {
    fontFamily: typography.bold,
    fontSize: 12,
    color: colors.ink,
  },
  overallTrack: {
    height: 6,
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#EFE4D8',
    overflow: 'hidden',
  },
  overallFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: colors.pink,
  },
  badgeHintText: {
    fontFamily: typography.regular,
    fontSize: 12,
    color: '#8A7568',
    paddingHorizontal: 2,
    marginTop: -2,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  badgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeCardUnlocked: {
    borderWidth: 1.5,
    borderColor: '#F2D7B8',
  },
  badgeCardLocked: {
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.07)',
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
  artworkFrame: {
    width: '100%',
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeName: {
    fontFamily: typography.semiBold,
    fontSize: 11,
    color: colors.ink,
    textAlign: 'center',
    width: '100%',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  statusPillUnlocked: {
    backgroundColor: '#EDF5E5',
  },
  statusPillLocked: {
    backgroundColor: '#F5EEE7',
  },
  statusTextUnlocked: {
    fontFamily: typography.bold,
    fontSize: 9.5,
    color: '#567232',
  },
  statusTextLocked: {
    fontFamily: typography.medium,
    fontSize: 9.5,
    color: '#917E72',
  },
  badgeProgressTrack: {
    height: 4.5,
    width: '100%',
    borderRadius: 4,
    backgroundColor: '#EFE4D8',
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  badgeCounterText: {
    fontFamily: typography.medium,
    fontSize: 10,
    color: '#8A7568',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF5E8',
    borderWidth: 1,
    borderColor: '#F2D7B8',
    borderRadius: 18,
    padding: 14,
  },
  warningText: {
    fontFamily: typography.regular,
    fontSize: 12.5,
    color: '#7A5B3D',
    flex: 1,
    lineHeight: 18,
  },
  howToPlayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.07)',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  howToPlayIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FAF2EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howToPlayTextWrapper: {
    flex: 1,
    gap: 2,
  },
  howToPlayTitle: {
    fontFamily: typography.bold,
    fontSize: 14,
    color: colors.ink,
  },
  howToPlaySubtitle: {
    fontFamily: typography.regular,
    fontSize: 11.5,
    color: '#8A7568',
  },
});
