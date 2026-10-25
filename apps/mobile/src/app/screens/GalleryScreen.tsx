import { PrivateImage as Image } from '../components/PrivateImage';
import GalleryPhoto from '../components/GalleryPhoto';
import React, { useEffect, useState } from 'react';
import { View, Text, AppState, TextInput, ScrollView, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';
import { AnimalItem } from '../types';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import { useTranslation } from '../../core/i18n/useLanguageStore';
import { TranslationDictionary } from '../../core/i18n/translations';
import { SearchIcon, HeartIcon, LocationIcon } from '../components/CatalogIcons';
import { ui, colors, Button, Hippo, typography } from '../components/Design';
import AppIcon from '../components/AppIcon';
import { SkeletonGalleryGrid } from '../components/Skeleton';
import SpeedDialFab from '../components/SpeedDialFab';

export const animalLocation = (category: string) => category === 'Domestic' ? 'My Home' : category === 'Zoo' ? 'Chiang Mai Zoo' : 'Unknown location';
export const locationForAnimal = (animal: AnimalItem) => {
  if (animal.latitude != null && animal.longitude != null) {
    if (Math.abs(animal.latitude - 18.81) < 0.025 && Math.abs(animal.longitude - 98.948) < 0.025) return 'Chiang Mai Zoo';
    return `${animal.latitude.toFixed(2)}, ${animal.longitude.toFixed(2)}`;
  }
  return animalLocation(animal.category);
};
export const animalType = (animal: AnimalItem) => ({Mammal: 'Mammals', Bird: 'Birds', Reptile: 'Reptiles', Fish: 'Fish', Amphibian: 'Amphibians', Insect: 'Insects', Invertebrate: 'Invertebrates', Unknown: 'Unknown'}[animal.animalType || 'Unknown']);

const FILTER_KEYS = [
  'All',
  'Favorites',
  'Mammals',
  'Birds',
  'Reptiles',
  'Fish',
  'Amphibians',
  'Insects',
  'Invertebrates',
  'Unknown',
] as const;

const getFilterLabel = (key: string, t: TranslationDictionary) => {
  switch (key) {
    case 'All': return t.gallery.filterAll;
    case 'Favorites': return t.gallery.filterFavorites;
    case 'Mammals': return t.gallery.filterMammals;
    case 'Birds': return t.gallery.filterBirds;
    case 'Reptiles': return t.gallery.filterReptiles;
    case 'Fish': return t.gallery.filterFish;
    case 'Amphibians': return t.gallery.filterAmphibians;
    case 'Insects': return t.gallery.filterInsects;
    case 'Invertebrates': return t.gallery.filterInvertebrates;
    case 'Unknown': return t.gallery.filterUnknown;
    default: return key;
  }
};

export default function GalleryScreen(_props?: {
  navigation?: unknown;
  route?: unknown;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useCollectionStore();
  const { t } = useTranslation();
  const userId = useAuthStore(state => state.user?.id);
  const accessToken = useAuthStore(state => state.tokens?.accessToken);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [location, setLocation] = useState('All Locations');
  const [giftError, setGiftError] = useState('');

  useEffect(() => { setGiftError(''); }, [userId]);
  const claimGift = () => {
    try {
      store.claimStarterGift();
      setGiftError('');
    } catch {
      setGiftError('Unable to claim gift. Please try again.');
    }
  };

  useEffect(() => {
    store.loadCollections();
  }, [store.loadCollections, userId, accessToken]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void store.loadCollections(); });
    return () => listener.remove();
  }, [store.loadCollections]);

  const pending = store.collections.filter(item => item.syncStatus === 'pending' || item.id.startsWith('local_coll_'));
  useEffect(() => {
    if (!userId || !pending.length) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && !useCollectionStore.getState().isSyncing) void useCollectionStore.getState().syncPendingCollections();
    }, 30000);
    return () => clearInterval(timer);
  }, [userId, pending.length]);

  const animals = store.getGalleryGrid().filter(a => !a.isLocked);
  const locations = [...new Set(animals.map(a => locationForAnimal(a)))];
  const isAllLocations = location === 'All Locations' || location === t.gallery.allLocations;
  const visible = animals.filter(a =>
    (a.name + ' ' + a.species).toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'All' || (filter === 'Favorites' && a.isFavorite) || animalType(a) === filter) &&
    (isAllLocations || locationForAnimal(a) === location)
  );
  const discoveredCount = new Set(animals.map(animal => animal.species.trim().toLowerCase())).size;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={ui.page}>
      <FlatList
        data={visible}
        numColumns={2}
        keyExtractor={animal => animal.id}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columns}
        refreshing={store.isLoading}
        onRefresh={store.loadCollections}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={false}
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Top Title & Header Row */}
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.screenHeading}>{t.gallery.heading}</Text>
                <Text style={styles.screenSubtitle}>{t.gallery.subtitle}</Text>
              </View>
              {/* Stat Pill Badge */}
              <View style={styles.summaryBadge}>
                <View style={styles.pawIconContainer}>
                  <Image source={require('../../../assets/icons/animals-collected.png')} style={styles.pawIcon} resizeMode="contain" accessible={false}/>
                </View>
                <Text style={styles.summaryText}>{t.gallery.totalDiscovered}: {discoveredCount} {t.gallery.speciesCount}</Text>
              </View>
            </View>

            {/* Starter Gift Banner (if available) */}
            {!!userId && store.starterGiftAvailable && (
              <View style={[ui.banner, styles.giftBanner]}>
                <View style={ui.row}>
                  <Hippo size={54}/>
                  <View style={styles.giftCopy}>
                    <Text style={styles.giftTitle}>{t.gallery.starterGiftTitle}</Text>
                    <Text style={styles.giftSubtitle}>{t.gallery.starterGiftSubtitle}</Text>
                  </View>
                </View>
                {!!giftError && <Text accessibilityRole="alert" style={styles.alertText}>{giftError}</Text>}
                <Button label={t.gallery.claimGift} onPress={claimGift}/>
              </View>
            )}

            {/* Pending Sync Banner */}
            {!!pending.length && (
              <View style={styles.syncBanner}>
                <View style={ui.row}>
                  <AppIcon name="sparkles" size={18} color="#C48834"/>
                  <Text style={styles.syncText}>{pending.length} {t.gallery.discoveriesSavedWaiting}</Text>
                </View>
                <Pressable accessibilityRole="button" disabled={store.isSyncing} onPress={() => void store.loadCollections()}>
                  <Text style={styles.syncButtonText}>{store.isSyncing ? t.common.loading : t.common.retry}</Text>
                </Pressable>
              </View>
            )}

            {!!store.loadError && <Text accessibilityRole="alert" style={styles.alertText}>{store.loadError}</Text>}

            {/* Search Input */}
            <View style={styles.searchBar}>
              <SearchIcon color="#8E7E73" size={19}/>
              <TextInput
                accessibilityLabel={t.gallery.searchAnimals}
                placeholder={t.gallery.searchPlaceholder}
                placeholderTextColor="#A89B90"
                value={search}
                onChangeText={setSearch}
                style={styles.searchInput}
              />
              {!!search && (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} hitSlop={8}>
                  <AppIcon name="close" size={16} color="#A89B90"/>
                </Pressable>
              )}
            </View>

            {/* Horizontal Category Filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
              {FILTER_KEYS.map(labelKey => {
                const active = filter === labelKey;
                const displayText = getFilterLabel(labelKey, t);
                return (
                  <Pressable
                    key={labelKey}
                    accessibilityRole="button"
                    accessibilityLabel={displayText}
                    accessibilityState={{selected: active}}
                    onPress={() => setFilter(labelKey)}
                    style={[styles.categoryPill, active && styles.activeCategoryPill]}
                  >
                    {labelKey === 'Favorites' && <HeartIcon size={13} color={active ? '#FFFFFF' : colors.pink}/>}
                    <Text style={[styles.categoryPillText, active && styles.activeCategoryPillText]}>{displayText}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Location Sub-Filters (only show if locations exist) */}
            {locations.length > 0 && (
              <View style={styles.locationContainer}>
                {['All Locations', ...locations].map(locItem => {
                  const active = location === locItem;
                  const count = animals.filter(animal => locationForAnimal(animal) === locItem).length;
                  const displayText = locItem === 'All Locations' ? t.gallery.allLocations : locItem;
                  return (
                    <Pressable
                      key={locItem}
                      accessibilityRole="button"
                      accessibilityLabel={displayText}
                      accessibilityState={{selected: active}}
                      onPress={() => setLocation(locItem)}
                      style={[styles.locationPill, active && styles.activeLocationPill]}
                    >
                      <LocationIcon size={13} color={active ? '#FFFFFF' : colors.pink}/>
                      <Text style={[styles.locationPillText, active && styles.activeLocationPillText]}>
                        {displayText}{locItem !== 'All Locations' ? ` (${count})` : ''}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        }
        renderItem={({item}) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${item.name}`}
            onPress={() => navigation.navigate('AnimalDetail', {animalId: item.id})}
            style={({pressed}) => [styles.card, pressed && styles.cardPressed]}
          >
            {/* Photo Container */}
            <View style={styles.photoContainer}>
              <GalleryPhoto uri={item.imageUri} name={item.name}/>

              {/* Badges on Photo */}
              <View style={styles.photoBadgesTop}>
                {item.category ? (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                ) : <View/>}
                {item.isFavorite && (
                  <View style={styles.favoriteBadge}>
                    <HeartIcon size={12} color="#FFFFFF"/>
                  </View>
                )}
              </View>
            </View>

            {/* Card Information */}
            <View style={styles.cardInfo}>
              <Text numberOfLines={1} style={styles.animalName}>{item.name}</Text>
              {item.syncStatus === 'pending' && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>{t.gallery.waitingToSync}</Text>
                </View>
              )}
              <View style={styles.locationRow}>
                <LocationIcon size={12} color={colors.pink}/>
                <Text numberOfLines={1} style={styles.locationText}>{locationForAnimal(item)}</Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          store.isLoading && store.collections.length === 0 ? (
            <SkeletonGalleryGrid count={4} />
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <AppIcon name="paw" size={36} color="#A4826F"/>
              </View>
              <Text style={styles.emptyTitle}>{t.gallery.emptyTitle}</Text>
              <Text style={styles.emptyText}>{t.gallery.emptySubtitle}</Text>
              {filter !== 'All' || search.length > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.gallery.clearFilters}
                  onPress={() => { setSearch(''); setFilter('All'); setLocation('All Locations'); }}
                  style={styles.resetButton}
                >
                  <Text style={styles.resetButtonText}>{t.gallery.clearFilters}</Text>
                </Pressable>
              ) : null}
            </View>
          )
        }
      />
      <SpeedDialFab />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },
  columns: {
    gap: 12,
    justifyContent: 'space-between',
  },
  header: {
    gap: 12,
    marginBottom: 8,
  },
  titleRow: {
    gap: 10,
    marginBottom: 4,
  },
  screenHeading: {
    fontFamily: typography.extraBold,
    fontSize: 26,

    color: colors.ink,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontFamily: typography.medium,
    fontSize: 13,
    color: '#8A776A',

    marginTop: 2,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  pawIconContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pawIcon: {
    width: 20,
    height: 20,
  },
  summaryText: {
    fontFamily: typography.bold,
    fontSize: 12,

    color: colors.ink,
  },
  giftBanner: {
    gap: 10,
    backgroundColor: '#FFF4E8',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F8D8B6',
    padding: 16,
  },
  giftCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  giftTitle: {
    fontFamily: typography.extraBold,
    fontSize: 17,

    color: colors.ink,
  },
  giftSubtitle: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: '#70584B',
    marginTop: 2,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8E6',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F3DE9A',
  },
  syncText: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: '#795822',

    flex: 1,
    marginLeft: 6,
  },
  syncButtonText: {
    fontFamily: typography.bold,
    fontSize: 12,

    color: '#9E6A1B',
  },
  alertText: {
    fontFamily: typography.semiBold,
    fontSize: 13,
    color: '#B53333',

  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
    borderRadius: 22,
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: typography.fontFamily,
    color: colors.ink,
  },
  filterScroll: {
    gap: 7,
    paddingVertical: 2,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 34,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
  },
  activeCategoryPill: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
    shadowColor: colors.pink,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  categoryPillText: {
    fontFamily: typography.semiBold,
    color: '#736155',
    fontSize: 12,

  },
  activeCategoryPillText: {
    fontFamily: typography.bold,
    color: '#FFFFFF',

  },
  locationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.07)',
  },
  activeLocationPill: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  locationPillText: {
    fontFamily: typography.medium,
    color: '#6E5D52',
    fontSize: 11,

  },
  activeLocationPillText: {
    fontFamily: typography.bold,
    color: '#FFFFFF',

  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.06)',
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: '48.5%',
    marginBottom: 2,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: '#F5ECE1',
  },
  photoBadgesTop: {
    position: 'absolute',
    top: 7,
    left: 7,
    right: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(40, 24, 15, 0.6)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontFamily: typography.bold,
    color: '#FFFFFF',
    fontSize: 9,

    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  favoriteBadge: {
    backgroundColor: colors.pink,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  cardInfo: {
    padding: 10,
    gap: 4,
  },
  animalName: {
    fontFamily: typography.bold,
    color: colors.ink,
    fontSize: 14,

    letterSpacing: -0.2,
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF0F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingText: {
    fontFamily: typography.semiBold,
    fontSize: 10,
    color: colors.pink,

  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  locationText: {
    fontFamily: typography.medium,
    flex: 1,
    color: '#847367',
    fontSize: 11,

  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontFamily: typography.bold,
    fontSize: 17,

    color: colors.ink,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    fontSize: 13,
    color: '#8B7B70',
    textAlign: 'center',
    lineHeight: 19,
  },
  resetButton: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.12)',
  },
  resetButtonText: {
    fontFamily: typography.semiBold,
    fontSize: 12,

    color: colors.ink,
  },
});
