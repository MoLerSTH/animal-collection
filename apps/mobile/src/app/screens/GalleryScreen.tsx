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
import { SearchIcon, HeartIcon, LocationIcon } from '../components/CatalogIcons';
import { ui, colors, Button, Hippo } from '../components/Design';
export const animalLocation = (category: string) => category === 'Domestic' ? 'My Home' : category === 'Zoo' ? 'Chiang Mai Zoo' : 'Unknown location';
export const locationForAnimal = (animal: AnimalItem) => {
  if (animal.latitude != null && animal.longitude != null) {
    if (Math.abs(animal.latitude - 18.81) < 0.025 && Math.abs(animal.longitude - 98.948) < 0.025) return 'Chiang Mai Zoo';
    return `${animal.latitude.toFixed(2)}, ${animal.longitude.toFixed(2)}`;
  }
  return animalLocation(animal.category);
};
export const animalType = (animal: AnimalItem) => ({Mammal: 'Mammals', Bird: 'Birds', Reptile: 'Reptiles', Fish: 'Fish', Amphibian: 'Amphibians', Insect: 'Insects', Invertebrate: 'Invertebrates', Unknown: 'Unknown'}[animal.animalType || 'Unknown']);
export default function GalleryScreen(_props?: {
  navigation?: unknown;
  route?: unknown;
}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useCollectionStore();
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
  const visible = animals.filter(a => (a.name + ' ' + a.species).toLowerCase().includes(search.toLowerCase()) && (filter === 'All' || filter === 'Favorites' && a.isFavorite || animalType(a) === filter) && (location === 'All Locations' || locationForAnimal(a) === location));
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={ui.page}>
      <FlatList data={visible} numColumns={2} keyExtractor={animal => animal.id}
        contentContainerStyle={ui.content} columnWrapperStyle={styles.columns}
        refreshing={store.isLoading} onRefresh={store.loadCollections}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={ui.title}>Animal Catalog</Text>
            {!!userId && store.starterGiftAvailable && <View style={[ui.banner, styles.gift]}>
              <View style={ui.row}>
                <Hippo size={58}/>
                <View style={styles.giftCopy}>
                  <Text style={styles.giftTitle}>Starter Gift!</Text>
                  <Text style={ui.text}>A free Hippopotamus card for this account.</Text>
                </View>
              </View>
              {!!giftError && <Text accessibilityRole="alert" style={ui.text}>{giftError}</Text>}
              <Button label="Claim Gift" onPress={claimGift}/>
            </View>}
            {!!pending.length && <View style={ui.banner}>
              <Text style={ui.text}>{pending.length} discoveries saved on this device · waiting to sync</Text>
              <Pressable accessibilityRole="button" disabled={store.isSyncing} onPress={() => void store.loadCollections()}><Text style={[ui.text, {fontWeight: '700'}]}>{store.isSyncing ? 'Syncing…' : 'Retry sync'}</Text></Pressable>
            </View>}
            {!!store.loadError && <Text accessibilityRole="alert" style={ui.text}>{store.loadError}</Text>}
            <View style={styles.search}>
              <SearchIcon color={colors.ink}/>
              <TextInput accessibilityLabel="Search animals" placeholder="Search animals..." placeholderTextColor="#A49386"
                value={search} onChangeText={setSearch} style={styles.searchInput}/>
            </View>
            <View style={styles.summary}>
              <View style={styles.pawFrame}>
                <Image source={require('../../../assets/icons/animals-collected.png')} style={styles.paw} resizeMode="contain" accessible={false}/>
              </View>
              <Text style={styles.summaryText}>Total Discovered: {new Set(animals.map(animal => animal.species.trim().toLowerCase())).size} Species</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {['All', 'Favorites', 'Mammals', 'Birds', 'Reptiles', 'Fish', 'Amphibians', 'Insects', 'Invertebrates', 'Unknown'].map(label => {
                const active = filter === label;
                return <Pressable key={label} accessibilityRole="button" accessibilityLabel={label}
                  accessibilityState={{selected: active}} onPress={() => setFilter(label)}
                  style={[styles.pill, active && styles.activePill]}>
                  {label === 'Favorites' && <HeartIcon size={14} color={active ? 'white' : colors.pink}/>}
                  <Text style={[styles.pillText, active && styles.activeText]}>{label}</Text>
                </Pressable>;
              })}
            </ScrollView>
            <View style={styles.locations}>
              {['All Locations', ...locations].map(label => {
                const active = location === label;
                const count = animals.filter(animal => locationForAnimal(animal) === label).length;
                return <Pressable key={label} accessibilityRole="button" accessibilityLabel={label}
                  accessibilityState={{selected: active}} onPress={() => setLocation(label)}
                  style={[styles.pill, styles.locationPill, active && styles.activePill]}>
                  <LocationIcon size={15} color={active ? 'white' : colors.pink}/>
                  <Text style={[styles.pillText, active && styles.activeText]}>{label}{label !== 'All Locations' ? ` (${count})` : ''}</Text>
                </Pressable>;
              })}
            </View>
          </View>
        }
        renderItem={({item}) => (
          <Pressable accessibilityRole="button" accessibilityLabel={`View ${item.name}`}
            onPress={() => navigation.navigate('AnimalDetail', {animalId: item.id})} style={[ui.card, styles.animalCard]}>
            <GalleryPhoto uri={item.imageUri} name={item.name}/>
            <Text style={styles.animalName}>{item.name}</Text>
            {item.syncStatus === 'pending' && <Text style={[ui.text, {fontSize: 11, color: colors.pink}]}>Waiting to sync</Text>}
            <View style={styles.cardLocation}>
              <LocationIcon size={14} color={colors.pink}/>
              <Text style={styles.cardLocationText}>{locationForAnimal(item)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={ui.text}>No discoveries here yet. Photograph an animal to start your album!</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  columns: {gap: 12},
  header: {gap: 12, marginBottom: 18},
  gift: {gap: 10},
  giftCopy: {flex: 1},
  giftTitle: {fontSize: 18, fontWeight: '800', color: colors.ink},
  search: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, minHeight: 42, backgroundColor: '#FFFCF7', borderWidth: 1, borderColor: '#F0E1CE', borderRadius: 24},
  searchInput: {flex: 1, minWidth: 0, paddingVertical: 10, fontSize: 13, color: colors.ink},
  summary: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 15, backgroundColor: colors.blush},
  pawFrame: {width: 29, height: 29, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  paw: {width: 39, height: 39},
  summaryText: {flex: 1, fontSize: 14, fontWeight: '700', color: colors.ink},
  filters: {gap: 5, paddingVertical: 2},
  pill: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 8, minHeight: 33, borderRadius: 22, borderWidth: 1, borderColor: '#F0E1CE', backgroundColor: '#FFFCF7'},
  activePill: {backgroundColor: colors.pink, borderColor: colors.pink},
  pillText: {color: colors.ink, fontSize: 11, fontWeight: '500'},
  activeText: {color: 'white'},
  locations: {flexDirection: 'row', flexWrap: 'wrap', gap: 7},
  locationPill: {paddingHorizontal: 10},
  animalCard: {flex: 1, padding: 6, marginBottom: 12, maxWidth: '49%'},
  animalName: {color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '700', textAlign: 'center', marginTop: 3},
  cardLocation: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 2},
  cardLocationText: {flexShrink: 1, color: colors.ink, fontSize: 10, lineHeight: 14, textAlign: 'center'},
});
