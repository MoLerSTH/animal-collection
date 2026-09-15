import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import { RootStackParamList } from '../navigation/types';
import CustomButton from '../components/CustomButton';
import AttributeBadge from '../components/AttributeBadge';
import { AnimalItem } from '../types';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';
import { CatalogAnimal } from '../../features/collections/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AnimalDetail'>;

// SVG Heart icon
function HeartIcon({ filled, color }: { filled: boolean; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// SVG Chevron Back icon
function ChevronBackIcon({ color = '#3A2E2B', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function AnimalDetailScreen({ route, navigation }: Props) {
  const { imageUri, animalId } = route.params ?? {};
  const { catalog, getAnimalById, addCollection, isSubmitting } = useCollectionStore();

  const existing: AnimalItem | undefined = useMemo(
    () => (animalId ? getAnimalById(animalId) : undefined),
    [animalId, getAnimalById],
  );
  // Find matching catalog animal if editing or navigating with animalId
  const initialSpecies = useMemo(() => {
    if (animalId) {
      return (
        catalog.find(
          (c) =>
            c.id === animalId ||
            c.code === animalId ||
            c.name.toLowerCase() === animalId.toLowerCase(),
        ) ?? null
      );
    }
    return catalog[0] ?? null;
  }, [animalId, catalog]);

  const [selectedSpecies, setSelectedSpecies] = useState<CatalogAnimal | null>(initialSpecies);
  const [name, setName] = useState(
    existing?.name || existing?.species || initialSpecies?.name || 'Hippopotamus',
  );
  const [story, setStory] = useState(existing?.story ?? initialSpecies?.defaultStory ?? '');
  const [favFood, setFavFood] = useState(existing?.favFood ?? initialSpecies?.defaultFavFood ?? '');
  const [temperament, setTemperament] = useState(
    existing?.temperament ?? initialSpecies?.defaultTemperament ?? '',
  );
  const [isFavorite, setIsFavorite] = useState(existing?.isFavorite ?? false);

  const displayImage = imageUri ?? existing?.imageUri ?? null;

  const handleSelectSpecies = (item: CatalogAnimal | null) => {
    setSelectedSpecies(item);
    if (item) {
      if (!name || (selectedSpecies && name === selectedSpecies.name) || name === 'Hippopotamus') {
        setName(item.name);
      }
      if (!story || (selectedSpecies && story === selectedSpecies.defaultStory)) {
        setStory(item.defaultStory || '');
      }
      if (!favFood || (selectedSpecies && favFood === selectedSpecies.defaultFavFood)) {
        setFavFood(item.defaultFavFood || '');
      }
      if (!temperament || (selectedSpecies && temperament === selectedSpecies.defaultTemperament)) {
        setTemperament(item.defaultTemperament || '');
      }
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;

    try {
      const saved = await addCollection({
        photoUri: displayImage || 'https://images.unsplash.com/photo-1544985361-b421a9c1482e?w=800&auto=format&fit=crop',
        animalId: existing?.id,
        name: name.trim() || 'Discovered Animal',
        photoUri:
          displayImage ||
          'https://images.unsplash.com/photo-1544985361-b421a9c1482e?w=800&auto=format&fit=crop',
        animalId: selectedSpecies?.id,
        name: name.trim() || selectedSpecies?.name || 'Discovered Animal',
        story,
        favFood,
        temperament,
        isFavorite,
      });

      // ตรวจสอบว่ามีหน้า ShareTemplate ใน Stack อยู่ก่อนหน้าแล้วหรือไม่ (กรณีเข้ามาจากปุ่ม Edit)
      // Check if ShareTemplate route is already in the stack
      const routes = navigation.getState()?.routes;
      const hasPreviousShareTemplate = routes?.some((r) => r.name === 'ShareTemplate');

      if (hasPreviousShareTemplate) {
        navigation.navigate({
          name: 'ShareTemplate',
          params: { animalId: saved.id },
          merge: true,
        });
        navigation.navigate('ShareTemplate', { animalId: saved.id });
      } else {
        navigation.replace('ShareTemplate', { animalId: saved.id });
      }
    } catch (err) {
      Alert.alert('Collection Notice', 'Could not sync with server, saved locally.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        {/* Back button with rounded background */}
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          style={styles.headerButton}
        >
          <ChevronBackIcon />
        </Pressable>

        <Text style={styles.headerTitle}>{name}</Text>

        {/* Favorite heart button with rounded pink background */}
        <Pressable
          onPress={() => setIsFavorite((prev: boolean) => !prev)}
          accessibilityLabel="Toggle favorite"
          style={styles.heartButton}
        >
          <HeartIcon filled={isFavorite} color="#BA796B" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.imageContainer}>
          {displayImage ? (
            <Image source={{ uri: displayImage }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderEmoji}>🐾</Text>
            </View>
          )}
        </View>

        {/* Species selector chips */}
        <View style={styles.fieldGroupFirst}>
          <Text style={styles.label}>Animal Species</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.speciesChipRow}
          >
            {catalog.map((catItem) => {
              const isSelected = selectedSpecies?.id === catItem.id;
              return (
                <Pressable
                  key={catItem.id}
                  onPress={() => handleSelectSpecies(catItem)}
                  style={[styles.speciesChip, isSelected && styles.speciesChipSelected]}
                >
                  <Text
                    style={[
                      styles.speciesChipText,
                      isSelected && styles.speciesChipTextSelected,
                    ]}
                  >
                    {catItem.name}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => handleSelectSpecies(null)}
              style={[styles.speciesChip, selectedSpecies === null && styles.speciesChipSelected]}
            >
              <Text
                style={[
                  styles.speciesChipText,
                  selectedSpecies === null && styles.speciesChipTextSelected,
                ]}
              >
                ✨ Custom / Other
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Animal Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Hippopotamus"
            placeholder={selectedSpecies ? `e.g. ${selectedSpecies.name}` : 'e.g. My Discovery'}
            placeholderTextColor="#3A2E2B66"
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>
            Story & Quirks
          </Text>
          <TextInput
            value={story}
            onChangeText={setStory}
            placeholder="What made this encounter special?"
            placeholderTextColor="#3A2E2B66"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={[styles.input, styles.textArea]}
          />
        </View>

        <View style={styles.rowFieldGroup}>
          <View style={styles.halfField}>
            <Text style={styles.label}>Fav Snack</Text>
            <TextInput
              value={favFood}
              onChangeText={setFavFood}
              placeholder="Golden Berries"
              placeholderTextColor="#3A2E2B66"
              style={styles.input}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.label}>
              Temperament
            </Text>
            <TextInput
              value={temperament}
              onChangeText={setTemperament}
              placeholder="Extremely Shy"
              placeholderTextColor="#3A2E2B66"
              style={styles.input}
            />
          </View>
        </View>

        {(favFood || temperament) && (
          <View style={styles.badgeRow}>
            <AttributeBadge label="Fav Snack" value={favFood} />
            <AttributeBadge label="Temperament" value={temperament} />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonWrapper}>
          <CustomButton label="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
        <View style={styles.buttonWrapper}>
          <CustomButton label="Confirm" loading={isSubmitting} onPress={handleConfirm} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F5EF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(196, 164, 132, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2E2B',
  },
  heartButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FBE4DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  imageContainer: {
    marginTop: 16,
    aspectRatio: 4 / 3,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'rgba(196, 164, 132, 0.3)',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  placeholderContainer: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  fieldGroupFirst: {
    marginTop: 20,
  },
  speciesChipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  speciesChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(196, 164, 132, 0.2)',
  },
  speciesChipSelected: {
    backgroundColor: '#3A2E2B',
  },
  speciesChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A2E2B',
  },
  speciesChipTextSelected: {
    color: '#FFFFFF',
  },
  fieldGroup: {
    marginTop: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: 'rgba(58, 46, 43, 0.6)',
  },
  input: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#3A2E2B',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  textArea: {
    minHeight: 100,
  },
  rowFieldGroup: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  badgeRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  buttonWrapper: {
    flex: 1,
  },
});
