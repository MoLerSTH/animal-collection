import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import PolaroidCard from '../components/PolaroidCard';
import CustomButton from '../components/CustomButton';
import { InstagramIcon, TikTokIcon, FacebookIcon, GalleryAddIcon } from '../components/ShareIcons';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';

type Props = NativeStackScreenProps<RootStackParamList, 'ShareTemplate'>;

type ShareTarget = 'instagram' | 'tiktok' | 'facebook';

export default function ShareTemplateScreen({ route, navigation }: Props) {
  const { animalId } = route.params;
  const [saved, setSaved] = useState(false);
  const { getAnimalById, getGalleryGrid } = useCollectionStore();

  const animal = useMemo(() => {
    return getAnimalById(animalId) ?? getGalleryGrid()[0];
  }, [animalId, getAnimalById, getGalleryGrid]);

  const handleShare = (target: ShareTarget) => {
    // TODO: integrate expo-sharing / react-native-share and target-specific deep links
    Alert.alert('Share', `Sharing to ${target} is not yet wired up.`);
  };

  const handleAddToGallery = () => {
    // TODO: persist `animal` into gallery state / AsyncStorage
    setSaved(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Share Template</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.cardContainer}>
          <PolaroidCard animal={animal} />
        </View>

        <View style={styles.shareActions}>
          <ShareRow label="Share to Instagram Story" icon={<InstagramIcon />} onPress={() => handleShare('instagram')} />
          <ShareRow label="Share to TikTok" icon={<TikTokIcon />} onPress={() => handleShare('tiktok')} />
          <ShareRow label="Post to Facebook" icon={<FacebookIcon />} onPress={() => handleShare('facebook')} />
          <ShareRow
            label={saved ? 'Added to Gallery ✓' : 'Add to Gallery'}
            icon={<GalleryAddIcon />}
            onPress={handleAddToGallery}
            disabled={saved}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <CustomButton
          label="Edit"
          variant="secondary"
          onPress={() =>
            navigation.navigate('AnimalDetail', { animalId: animal.id, imageUri: animal.imageUri ?? undefined })
          }
        />
      </View>
    </SafeAreaView>
  );
}

function ShareRow({
  label,
  icon,
  onPress,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.shareRow, disabled && styles.shareRowDisabled]}
    >
      {icon}
      <Text style={styles.shareRowLabel}>{label}</Text>
    </Pressable>
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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backButtonText: {
    fontSize: 20,
    color: '#3A2E2B',
  },
  headerTitle: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#3A2E2B',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  cardContainer: {
    marginTop: 16,
  },
  shareActions: {
    marginTop: 24,
    gap: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#3A2E2B',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  shareRowDisabled: {
    opacity: 0.5,
  },
  shareRowEmoji: {
    fontSize: 16,
  },
  shareRowLabel: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
