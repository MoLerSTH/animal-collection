import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import AnimalCard from '../components/AnimalCard';
import { AnimalItem } from '../types';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Gallery'>,
  NativeStackScreenProps<RootStackParamList>
>;

type FilterKey = 'all' | 'favorites';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All Animals' },
  { key: 'favorites', label: 'Favorites' },
];

export default function GalleryScreen({ navigation }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all');
  const { getGalleryGrid, loadCollections, isLoading } = useCollectionStore();

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const animals = getGalleryGrid();
  const caughtCount = animals.filter((a) => !a.isLocked).length;

  const visibleAnimals = useMemo(() => {
    if (filter === 'favorites') {
      return animals.filter((a) => a.isFavorite && !a.isLocked);
    }
    return animals;
  }, [animals, filter]);

  const handleAnimalPress = (animal: AnimalItem) => {
    navigation.navigate('ShareTemplate', { animalId: animal.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Animals</Text>
        <Text style={styles.subtitle}>
          Collected {caughtCount} / {animals.length}
        </Text>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  styles.filterButton,
                  active ? styles.filterButtonActive : styles.filterButtonInactive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    active ? styles.filterTextActive : styles.filterTextInactive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <FlatList
        data={visibleAnimals}
        keyExtractor={(item) => item.id}
        numColumns={4}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        refreshing={isLoading}
        onRefresh={loadCollections}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <AnimalCard animal={item} onPress={handleAnimalPress} />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No favorites yet — catch some animals!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20; // เท่ากับ header พอดี
const GAP = 12;
const NUM_COLUMNS = 4;

// คำนวณความกว้างการ์ดแต่ละใบให้พอดีและสมดุลทั้ง 4 คอลัมน์
const AVAILABLE_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2) - ((NUM_COLUMNS - 1) * GAP);
const CARD_WIDTH = Math.floor(AVAILABLE_WIDTH / NUM_COLUMNS);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5EF',
  },
  header: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3A2E2B',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: 'rgba(58, 46, 43, 0.6)',
  },
  filterRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3A2E2B',
  },
  filterButtonInactive: {
    backgroundColor: 'rgba(196, 164, 132, 0.2)',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  filterTextInactive: {
    color: 'rgba(58, 46, 43, 0.7)',
  },
  listContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: 14,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: 'rgba(58, 46, 43, 0.5)',
  },
});
