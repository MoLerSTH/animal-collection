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
import { View, Text, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';
import { NameSaveTimeoutError } from '../../features/collections/api/collectionApi';
import { ui, Button, colors } from '../components/Design';
import { locationForAnimal } from './GalleryScreen';
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
  const identificationFields = <IdentificationFields species={identifiedSpecies} animalType={animalType} tags={tags}
    onSpecies={setIdentifiedSpecies} onType={setAnimalType} onTags={setTags}/>;
  return (
    <SafeAreaView style={ui.page}>
      <ScrollView contentContainerStyle={ui.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={ui.row}>
          <AppIcon name="back"/><Text style={ui.text}>Back</Text>
        </Pressable>
        {!!savedId && !route.params.animalId && <View style={[ui.banner, ui.row, {backgroundColor: '#FFF0BC'}]}>
          <AppIcon name={newBadge ? 'sparkles' : 'paw'} color="#C49138" size={28}/>
          <Text style={[ui.text, {flex: 1, fontWeight: '700'}]}>{pendingSync ? 'Saved on this device · waiting to sync' : newBadge ? 'New Badge Unlocked!' : 'New discovery added!'}</Text>
        </View>}
        <View>
          {photo && <Image source={{uri: photo}} style={{width: '100%', aspectRatio: 1, borderRadius: 20}}/>}
          {/hippo/i.test(existing?.species || identifiedSpecies) && <View style={{position: 'absolute', bottom: 8, right: 8, backgroundColor: colors.gold, padding: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <AppIcon name="crown" size={20}/><Text style={[ui.text, {fontWeight: '700'}]}>Legendary</Text>
          </View>}
        </View>
        {existing ? <>
          <View style={ui.row}>
            <Text accessibilityRole="header" style={[ui.title, {flex: 1}]}>{displayName}</Text>
            {!existing.isLocked && <Pressable accessibilityRole="button" accessibilityLabel="Edit card name" disabled={saving || store.isSyncing || pendingName !== undefined}
              onPress={() => {setCardName(displayName); setEditingName(!editingName); setError('');}} style={ui.chip}>
              <AppIcon name="edit" size={20}/>
            </Pressable>}
          </View>
          {(savingName || pendingName !== undefined) && <Text accessibilityLiveRegion="polite" style={ui.text}>Saving name…</Text>}
          {editingName && <View style={[ui.card, {gap: 12}]}>
            <Text style={ui.text}>Card name</Text>
            <TextInput accessibilityLabel="Card name" maxLength={100} editable={!saving} value={cardName} onChangeText={setCardName}
              returnKeyType="done" onSubmitEditing={() => void rename()} style={[ui.card, ui.text]}/>
            <Button label={saving ? 'Saving…' : 'Save card name'} disabled={saving || store.isSyncing || !validCardName || cardName.trim() === displayName} onPress={() => void rename()}/>
            <Button label="Cancel name change" disabled={saving} onPress={() => setEditingName(false)}/>
          </View>}
        </> : <>
          <Text style={ui.text}>Identify your animal</Text>
          <ScrollView horizontal contentContainerStyle={{gap: 8}}>
            {store.catalog.map(animal => <Pressable key={animal.id} onPress={() => {setSpecies(animal.name); setIdentifiedSpecies(animal.name); setAnimalType('Unknown'); setTags([]); setStory(animal.defaultStory || '');}} style={[ui.chip, species === animal.name && ui.active]}>
              <Text style={ui.text}>{animal.name}</Text>
            </Pressable>)}
          </ScrollView>
          <TextInput accessibilityLabel="Animal name" value={species} onChangeText={setSpecies} placeholder="Animal name" style={[ui.card, ui.text]}/>
        </>}
        {!existing && !savedId && <>
          <View style={ui.row}>
            <Text style={[ui.text, {flex: 1}]}>ประเภทสัตว์: {animalType}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Edit animal identification" onPress={() => setEditingIdentification(!editingIdentification)} style={ui.chip}>
              <Text style={ui.text}>{editingIdentification ? 'ปิดการแก้ไข' : 'แก้ไขข้อมูลสัตว์'}</Text>
            </Pressable>
          </View>
          {editingIdentification && identificationFields}
        </>}
        {existing && <>
          <Text style={ui.text}>ประเภทสัตว์: {existing.animalType || 'Unknown'}</Text>
          <Button label={editingIdentification ? 'ยกเลิกแก้ไขประเภทสัตว์' : 'ระบุประเภทสัตว์'} disabled={saving || pendingName !== undefined} onPress={() => {
            if (!editingIdentification) {
              setIdentifiedSpecies(existing.identifiedSpecies || existing.species);
              setAnimalType(existing.animalType || 'Unknown'); setTags(existing.habitatTags || []);
            }
            setEditingIdentification(!editingIdentification);
          }}/>
          {editingIdentification && <>{identificationFields}<Button label={saving ? 'Saving…' : 'บันทึกข้อมูลสัตว์'} disabled={saving || !identifiedSpecies.trim()} onPress={updateIdentification}/></>}
        </>}
        <View style={ui.row}>
          <AppIcon name="calendar" size={24}/>
          <Text style={ui.text}>Captured on {new Date(existing?.caughtAt || Date.now()).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok'})}</Text>
        </View>
        <View style={ui.row}>
          <LocationIcon size={24} color={colors.pink}/>
          <Text style={[ui.text, {flex: 1}]}>{existing ? locationForAnimal(existing) : 'Location not recorded'}</Text>
        </View>
        <View style={[ui.banner, ui.row, {alignItems: 'flex-start'}]}>
          <AppIcon name="book" size={24}/>
          {existing ? <Text style={[ui.text, {flex: 1}]}>{existing.story || 'Your animal discovery.'}</Text> : <TextInput accessibilityLabel="Animal story" multiline value={story} onChangeText={setStory} placeholder="Add a story about your discovery" style={[ui.text, {flex: 1}]}/>}
        </View>
        {pendingSync && !!(savedRecord?.syncError || existing?.syncError) && <Text style={ui.text}>{savedRecord?.syncError || existing?.syncError}</Text>}
        {pendingSync && <Button label={store.isSyncing ? 'Syncing…' : 'Retry sync'} disabled={store.isSyncing} onPress={() => void store.syncPendingCollections()}/>}
        {!!error && <Text style={ui.text}>{error}</Text>}
        <View style={ui.row}>
          <View style={{flex: 2}}><Button label={savedId ? 'In Collection' : saving || store.isSubmitting ? 'Saving…' : 'Add to Collection'} icon={<HeartIcon color="white" size={18}/>} disabled={!!savedId || !species.trim() || !identifiedSpecies.trim() || store.isSubmitting || saving} onPress={save}/></View>
          <View style={{flex: 1}}><Button label="Share" icon={<AppIcon name="share" color="white" size={17}/>} disabled={!savedId} onPress={() => navigation.navigate('ShareTemplate', {animalId: savedId})}/></View>
        </View>
        {existing && <Button label={existing.isFavorite ? 'Remove Favorite' : 'Add Favorite'} icon={<HeartIcon color="white" size={18}/>} disabled={store.isSyncing} onPress={() => {void store.toggleFavorite(existing.id).catch(error => Alert.alert('Could not save favorite', error.message));}}/>}
      </ScrollView>
      <DetailTabs/>
    </SafeAreaView>
  );
}
