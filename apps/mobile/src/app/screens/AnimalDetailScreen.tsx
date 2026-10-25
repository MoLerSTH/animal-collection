import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import { PrivateImage as Image } from '../components/PrivateImage';
import IdentificationFields from '../components/IdentificationFields';
import { AnimalType, HabitatTag } from '../../features/collections/types';
import * as Location from 'expo-location';
import { achievements } from '../data/achievements';
import AppIcon from '../components/AppIcon';
import { HeartIcon, LocationIcon } from '../components/CatalogIcons';
import DetailTabs from '../components/DetailTabs';
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';
import { NameSaveTimeoutError } from '../../features/collections/api/collectionApi';
import { ui, Button, colors, typography } from '../components/Design';
import { useTranslation } from '../../core/i18n/useLanguageStore';
import { locationForAnimal } from './GalleryScreen';
import { SkeletonDetail, SkeletonGalleryGrid } from '../components/Skeleton';
type Props = NativeStackScreenProps<RootStackParamList, 'AnimalDetail'>;

export default function AnimalDetailScreen(props: Props) {
  // A reused navigation screen must initialize a separate draft for each card/photo.
  return <AnimalDetailContent key={props.route.params.animalId || props.route.params.imageUri || props.route.key} {...props}/>;
}

function AnimalDetailContent({
  route,
  navigation
}: Props) {
  const store = useCollectionStore();
  const { t } = useTranslation();
  const routeExisting = route.params.animalId ? store.getAnimalById(route.params.animalId) : undefined;
  const [savedId, setSavedId] = useState(routeExisting && !routeExisting.isLocked ? routeExisting.id : '');
  // Pin the selected collection once resolved. A previous name/species in the
  // route can now resolve to an unrelated (locked) catalog entry after editing.
  const savedAnimal = savedId ? store.getAnimalById(savedId) : undefined;
  const existing = savedAnimal && !savedAnimal.isLocked ? savedAnimal : routeExisting;

  useEffect(() => {
    // Sync can replace a local placeholder with its canonical server ID.
    if (existing && !existing.isLocked && existing.id !== savedId) setSavedId(existing.id);
  }, [existing?.id, existing?.isLocked, savedId]);

  const [species, setSpecies] = useState(existing?.species || route.params.identifiedSpecies || '');
  const [identifiedSpecies, setIdentifiedSpecies] = useState(existing?.identifiedSpecies || existing?.species || route.params.identifiedSpecies || '');
  const [animalType, setAnimalType] = useState<AnimalType>(existing?.animalType || route.params.animalType || 'Unknown');
  const [tags, setTags] = useState<HabitatTag[]>(existing?.habitatTags || route.params.habitatTags || []);
  const [editingIdentification, setEditingIdentification] = useState(false);
  const [story, setStory] = useState(existing?.story || route.params.identifiedStory || '');
  const [error, setError] = useState('');
  const [newBadge, setNewBadge] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [cardName, setCardName] = useState(existing?.name || '');
  const [isExitingToGallery, setIsExitingToGallery] = useState(false);
  const validCardName = cardName.trim().length > 0 && cardName.trim().length <= 100 && !/[\u0000-\u001f\u007f]/.test(cardName.trim());
  const savedRecord = store.collections.find(item => item.id === savedId || item.localId === savedId || `local_coll_${item.id}` === savedId);
  const pendingName = savedRecord ? store.pendingNames[savedRecord.id] ?? (savedRecord.localId ? store.pendingNames[savedRecord.localId] : undefined) : undefined;
  const displayName = pendingName ?? savedRecord?.name ?? existing?.name ?? '';
  const pendingSync = savedRecord?.syncStatus === 'pending' || existing?.syncStatus === 'pending';
  const photo = existing?.imageUri || route.params.imageUri;
  const catalog = store.catalog.find(a => a.name === identifiedSpecies);

  const save = async () => {
    if (!photo || !species.trim() || store.isSubmitting || saving) return;
    const saveOwner = useAuthStore.getState().user?.id;
    setSaving(true);
    try {
      let coordinates: {
        latitude: number;
        longitude: number;
      } | undefined;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            const position = await Promise.race([
              (async () => (await Location.getLastKnownPositionAsync({maxAge: 60000})) || Location.getCurrentPositionAsync({accuracy: Location.Accuracy.Balanced}))(),
              new Promise<null>(resolve => {timer = setTimeout(() => resolve(null), 5000);}),
            ]);
            if (position) coordinates = position.coords;
          } finally { if (timer) clearTimeout(timer); }
        }
      } catch {/* Location is optional; collection must still save. */}
      if (useAuthStore.getState().user?.id !== saveOwner) throw new Error('The account changed.');
      const before = achievements(store.collections).filter(b => b.unlocked).length;
      const result = await store.addCollection({
        ...coordinates,
        photoUri: photo,
        animalId: catalog?.id,
        name: species.trim(),
        identifiedSpecies: identifiedSpecies.trim(), animalType, habitatTags: tags,
        capturedAt: route.params.capturedAt,
        story
      });
      setSavedId(result.id);
      const updated = useCollectionStore.getState();
      setNewBadge(achievements(updated.collections).filter(b => b.unlocked).length > before);
      setError('');
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateIdentification = async () => {
    if (!existing || !identifiedSpecies.trim() || saving) return;
    setSaving(true);
    try {
      const before = achievements(store.collections).filter(b => b.unlocked).length;
      await store.updateIdentification(existing.id, {identifiedSpecies: identifiedSpecies.trim(), animalType, habitatTags: tags});
      const after = achievements(useCollectionStore.getState().collections).filter(b => b.unlocked).length;
      if (after > before) Alert.alert('New Badge Unlocked!', 'ภารกิจสำเร็จแล้ว ดูเหรียญสีได้ที่หน้า User');
      setEditingIdentification(false);
      setError('');
    } catch {
      setError('อัปเดตไม่สำเร็จ โปรดตรวจสอบการเชื่อมต่อแล้วลองใหม่');
    } finally { setSaving(false); }
  };

  const rename = async () => {
    if (!existing || !validCardName || saving || store.isSyncing || cardName.trim() === displayName) return;
    setSaving(true);
    setSavingName(true);
    setError('');
    try {
      const id = savedRecord?.id || existing.id;
      const request = store.renameCollection(id, cardName.trim());
      setEditingName(false);
      await request;
      const updated = useCollectionStore.getState().getAnimalById(id);
      if (updated && !updated.isLocked) setSavedId(updated.id);
      setEditingName(false);
    } catch (error) {
      setEditingName(true);
      setError(error instanceof NameSaveTimeoutError ? error.message : error instanceof Error && error.message.startsWith('Your starter gift is waiting to sync.')
        ? error.message : 'Could not change the card name. Please try again.');
    } finally { setSaving(false); setSavingName(false); }
  };

  const identificationFields = (
    <IdentificationFields
      species={identifiedSpecies}
      animalType={animalType}
      tags={tags}
      onSpecies={setIdentifiedSpecies}
      onType={setAnimalType}
      onTags={setTags}
    />
  );

  if (isExitingToGallery) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={ui.page}>
        <View style={styles.topNavRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.backButton}>
            <AppIcon name="back" size={18} color={colors.ink} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SkeletonGalleryGrid count={4} />
        </ScrollView>
        <DetailTabs activeTab="Gallery" />
      </SafeAreaView>
    );
  }

  if (route.params.animalId && !existing && store.isLoading) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={ui.page}>
        <View style={styles.topNavRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.backButton}>
            <AppIcon name="back" size={18} color={colors.ink} />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SkeletonDetail />
        </ScrollView>
        <DetailTabs activeTab="Gallery" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={ui.page}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Navigation Bar */}
        <View style={styles.topNavRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.common.back} onPress={() => navigation.goBack()} style={styles.backButton}>
            <AppIcon name="back" size={18} color={colors.ink} />
            <Text style={styles.backButtonText}>{t.common.back}</Text>
          </Pressable>
          {existing && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={existing.isFavorite ? t.detail.removeFavorite : t.detail.addFavorite}
              disabled={store.isSyncing}
              onPress={() => {
                void store.toggleFavorite(existing.id).catch(err => Alert.alert('Could not save favorite', err.message));
              }}
              style={[styles.favQuickButton, existing.isFavorite && styles.favQuickButtonActive]}
            >
              <HeartIcon size={18} color={existing.isFavorite ? '#FFFFFF' : colors.pink} />
            </Pressable>
          )}
        </View>

        {/* Status Notification Banner */}
        {!!savedId && !route.params.animalId && (
          <View style={styles.successBanner}>
            <AppIcon name={newBadge ? 'sparkles' : 'paw'} color="#C49138" size={26} />
            <Text style={styles.successBannerText}>
              {pendingSync ? t.detail.savedPendingSync : newBadge ? t.detail.newBadgeUnlocked : t.detail.newDiscoveryAdded}
            </Text>
          </View>
        )}

        {/* Hero Photo Card */}
        <View style={styles.heroPhotoWrapper}>
          {photo && <Image source={{uri: photo}} style={styles.heroPhoto} />}
          {/hippo/i.test(existing?.species || identifiedSpecies) && (
            <View style={styles.legendaryBadge}>
              <AppIcon name="crown" size={18} color="#976315" />
              <Text style={styles.legendaryText}>{t.detail.legendary}</Text>
            </View>
          )}
        </View>

        {/* Title & Editable Nickname Header */}
        {existing ? (
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text accessibilityRole="header" style={styles.titleText}>{displayName}</Text>
              {!existing.isLocked && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.detail.editCardName}
                  disabled={saving || store.isSyncing || pendingName !== undefined}
                  onPress={() => {
                    setCardName(displayName);
                    setEditingName(!editingName);
                    setError('');
                  }}
                  style={styles.editChip}
                >
                  <AppIcon name="edit" size={18} color={colors.ink} />
                </Pressable>
              )}
            </View>

            {(savingName || pendingName !== undefined) && (
              <Text accessibilityLiveRegion="polite" style={styles.savingNameIndicator}>{t.detail.savingName}</Text>
            )}

            {editingName && (
              <View style={styles.renameCard}>
                <Text style={styles.renameLabel}>{t.detail.cardName}</Text>
                <TextInput
                  accessibilityLabel={t.detail.cardName}
                  maxLength={100}
                  editable={!saving}
                  value={cardName}
                  onChangeText={setCardName}
                  returnKeyType="done"
                  onSubmitEditing={() => void rename()}
                  style={styles.renameInput}
                />
                <View style={ui.row}>
                  <View style={{flex: 1}}>
                    <Button
                      label={saving ? t.detail.saving : t.detail.saveCardName}
                      disabled={saving || store.isSyncing || !validCardName || cardName.trim() === displayName}
                      onPress={() => void rename()}
                    />
                  </View>
                  <View style={{flex: 1}}>
                    <Button
                      label={t.detail.cancelNameChange}
                      disabled={saving}
                      onPress={() => setEditingName(false)}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.identifySection}>
            <Text style={styles.sectionHeading}>{t.detail.identifyAnimal}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catalogScroll}>
              {store.catalog.map(animal => (
                <Pressable
                  key={animal.id}
                  onPress={() => {
                    setSpecies(animal.name);
                    setIdentifiedSpecies(animal.name);
                    setAnimalType('Unknown');
                    setTags([]);
                    setStory(animal.defaultStory || '');
                  }}
                  style={[styles.catalogChip, species === animal.name && styles.activeCatalogChip]}
                >
                  <Text style={[styles.catalogChipText, species === animal.name && styles.activeCatalogChipText]}>
                    {animal.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <TextInput
              accessibilityLabel="Animal name"
              value={species}
              onChangeText={setSpecies}
              placeholder="Animal name"
              placeholderTextColor="#A49386"
              style={styles.nameTextInput}
            />
          </View>
        )}

        {/* Species & Taxonomy Modification */}
        {!existing && !savedId && (
          <View style={styles.taxonomySection}>
            <View style={ui.row}>
              <Text style={styles.taxonomyLabel}>ประเภทสัตว์: {animalType}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Edit animal identification"
                onPress={() => setEditingIdentification(!editingIdentification)}
                style={styles.taxonomyChip}
              >
                <Text style={styles.taxonomyChipText}>{editingIdentification ? 'ปิดการแก้ไข' : 'แก้ไขข้อมูลสัตว์'}</Text>
              </Pressable>
            </View>
            {editingIdentification && <View style={styles.taxonomyEditorCard}>{identificationFields}</View>}
          </View>
        )}

        {existing && (
          <View style={styles.existingTaxonomyBox}>
            <View style={styles.bentoGrid}>
              <View style={styles.bentoItem}>
                <View style={styles.bentoIcon}>
                  <LocationIcon size={18} color={colors.pink} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.bentoLabel}>Location</Text>
                  <Text numberOfLines={1} style={styles.bentoValue}>{locationForAnimal(existing)}</Text>
                </View>
              </View>

              <View style={styles.bentoItem}>
                <View style={styles.bentoIcon}>
                  <AppIcon name="calendar" size={18} color="#C48834" />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.bentoLabel}>Captured</Text>
                  <Text numberOfLines={1} style={styles.bentoValue}>
                    {new Date(existing?.caughtAt || Date.now()).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok'})}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.taxonomyRow}>
              <Text style={styles.taxonomyLabel}>ประเภทสัตว์: {existing.animalType || 'Unknown'}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={saving || pendingName !== undefined}
                onPress={() => {
                  if (!editingIdentification) {
                    setIdentifiedSpecies(existing.identifiedSpecies || existing.species);
                    setAnimalType(existing.animalType || 'Unknown');
                    setTags(existing.habitatTags || []);
                  }
                  setEditingIdentification(!editingIdentification);
                }}
                style={styles.taxonomyChip}
              >
                <Text style={styles.taxonomyChipText}>
                  {editingIdentification ? 'ยกเลิกแก้ไขประเภทสัตว์' : 'ระบุประเภทสัตว์'}
                </Text>
              </Pressable>
            </View>

            {editingIdentification && (
              <View style={styles.taxonomyEditorCard}>
                {identificationFields}
                <Button
                  label={saving ? t.detail.saving : 'บันทึกข้อมูลสัตว์'}
                  disabled={saving || !identifiedSpecies.trim()}
                  onPress={updateIdentification}
                />
              </View>
            )}
          </View>
        )}

        {/* Date and Location fallback for fresh captures */}
        {!existing && (
          <View style={styles.metaFallbackCard}>
            <View style={ui.row}>
              <AppIcon name="calendar" size={20} color="#C48834" />
              <Text style={styles.metaFallbackText}>
                {t.detail.capturedOn} {new Date(Date.now()).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok'})}
              </Text>
            </View>
            <View style={ui.row}>
              <LocationIcon size={20} color={colors.pink} />
              <Text style={styles.metaFallbackText}>{t.detail.locationGps}</Text>
            </View>
          </View>
        )}

        {/* Field Notes & Story Card */}
        <View style={styles.fieldNotesCard}>
          <View style={styles.fieldNotesHeader}>
            <AppIcon name="book" size={20} color="#8A6753" />
            <Text style={styles.fieldNotesTitle}>{t.detail.fieldNotes}</Text>
          </View>
          {existing ? (
            <Text style={styles.storyText}>{existing.story || t.detail.defaultStory}</Text>
          ) : (
            <TextInput
              accessibilityLabel="Animal story"
              multiline
              value={story}
              onChangeText={setStory}
              placeholder={t.detail.fieldNotesPlaceholder}
              placeholderTextColor="#A89B90"
              style={styles.storyInput}
            />
          )}
        </View>

        {/* Sync Issues */}
        {pendingSync && !!(savedRecord?.syncError || existing?.syncError) && (
          <Text style={styles.errorText}>{savedRecord?.syncError || existing?.syncError}</Text>
        )}
        {pendingSync && (
          <Button
            label={store.isSyncing ? t.detail.syncing : t.detail.retrySync}
            disabled={store.isSyncing}
            onPress={() => void store.syncPendingCollections()}
          />
        )}
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Action Controls */}
        <View style={styles.actionSection}>
          <View style={ui.row}>
            <View style={{flex: 2}}>
              <Button
                label={savedId ? t.detail.inCollection : saving || store.isSubmitting ? t.detail.saving : t.detail.addToCollection}
                icon={<HeartIcon color="white" size={18}/>}
                disabled={!!savedId || !species.trim() || !identifiedSpecies.trim() || store.isSubmitting || saving}
                onPress={save}
              />
            </View>
            <View style={{flex: 1}}>
              <Button
                label={t.detail.share}
                icon={<AppIcon name="share" color="white" size={17}/>}
                disabled={!savedId}
                onPress={() => navigation.navigate('ShareTemplate', {animalId: savedId})}
              />
            </View>
          </View>

          {existing && (
            <Button
              label={existing.isFavorite ? t.detail.removeFavorite : t.detail.addFavorite}
              icon={<HeartIcon color="white" size={18}/>}
              disabled={store.isSyncing}
              onPress={() => {
                void store.toggleFavorite(existing.id).catch(err => Alert.alert('Could not save favorite', err.message));
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* Docked Modern Bottom Navigation */}
      <DetailTabs
        activeTab="Gallery"
        onTabPress={(tab) => {
          if (tab === 'Gallery') {
            setIsExitingToGallery(true);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 16,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  backButtonText: {
    fontFamily: typography.bold,
    fontSize: 13,

    color: colors.ink,
  },
  favQuickButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  favQuickButtonActive: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF4E0',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3DFB0',
  },
  successBannerText: {
    fontFamily: typography.bold,
    flex: 1,
    fontSize: 13,

    color: '#8A621F',
  },
  heroPhotoWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F5ECE1',
    position: 'relative',
    shadowColor: '#30180D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
  },
  legendaryBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#FFEBB8',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#F6D27A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  legendaryText: {
    fontFamily: typography.extraBold,
    fontSize: 12,

    color: '#7D4F0A',
    letterSpacing: 0.3,
  },
  titleSection: {
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleText: {
    fontFamily: typography.extraBold,
    fontSize: 26,

    color: colors.ink,
    letterSpacing: -0.4,
    flex: 1,
  },
  editChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
  },
  savingNameIndicator: {
    fontFamily: typography.semiBold,
    fontSize: 12,
    color: '#8E776A',

  },
  renameCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  renameLabel: {
    fontFamily: typography.bold,
    fontSize: 13,

    color: colors.ink,
  },
  renameInput: {
    fontFamily: typography.fontFamily,
    backgroundColor: '#FAF5EE',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
  },
  identifySection: {
    gap: 10,
  },
  sectionHeading: {
    fontFamily: typography.bold,
    fontSize: 14,

    color: colors.ink,
  },
  catalogScroll: {
    gap: 7,
    paddingVertical: 2,
  },
  catalogChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
  },
  activeCatalogChip: {
    backgroundColor: colors.pink,
    borderColor: colors.pink,
  },
  catalogChipText: {
    fontFamily: typography.semiBold,
    fontSize: 12,

    color: '#6F5C50',
  },
  activeCatalogChipText: {
    fontFamily: typography.bold,
    color: '#FFFFFF',

  },
  nameTextInput: {
    fontFamily: typography.fontFamily,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  taxonomySection: {
    gap: 10,
  },
  taxonomyLabel: {
    fontFamily: typography.semiBold,
    fontSize: 13,

    color: colors.ink,
    flex: 1,
  },
  taxonomyChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.1)',
  },
  taxonomyChipText: {
    fontFamily: typography.semiBold,
    fontSize: 12,

    color: colors.ink,
  },
  taxonomyEditorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
  },
  existingTaxonomyBox: {
    gap: 12,
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  bentoItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.07)',
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  bentoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FAF4ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLabel: {
    fontFamily: typography.semiBold,
    fontSize: 10,
    color: '#8B7B70',

    textTransform: 'uppercase',
  },
  bentoValue: {
    fontFamily: typography.bold,
    fontSize: 13,

    color: colors.ink,
    marginTop: 1,
  },
  taxonomyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.07)',
  },
  metaFallbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.07)',
  },
  metaFallbackText: {
    fontFamily: typography.semiBold,
    fontSize: 13,
    color: '#7B6A5E',

  },
  fieldNotesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  fieldNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldNotesTitle: {
    fontFamily: typography.bold,
    fontSize: 14,

    color: colors.ink,
  },
  storyText: {
    fontFamily: typography.fontFamily,
    fontSize: 14,
    color: '#5E493D',
    lineHeight: 22,
  },
  storyInput: {
    fontFamily: typography.fontFamily,
    backgroundColor: '#FAF5EE',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: colors.ink,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
  },
  errorText: {
    fontFamily: typography.semiBold,
    fontSize: 13,
    color: '#C0392B',

  },
  actionSection: {
    gap: 10,
    paddingTop: 4,
  },
});
