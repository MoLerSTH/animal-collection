import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
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
import { ui, colors, Hippo, typography } from '../components/Design';
import { SkeletonProfile } from '../components/Skeleton';

export default function UserProfileScreen() {
  const user = useAuthStore(state => state.user);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const store = useCollectionStore();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<BadgeName>();
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
  return <SafeAreaView edges={['top']} style={ui.page}>
    <ScrollView contentContainerStyle={ui.content}>
      <View style={{position: 'relative'}}>
        <Hippo/>
        <Pressable accessibilityRole="button" accessibilityLabel={t.profile.openSettings} onPress={() => nav.navigate('Settings')}
          style={{position: 'absolute', top: 0, right: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sand, borderRadius: 16}}>
          <AppIcon name="settings" size={24}/>
        </Pressable>
      </View>
      <Text style={[ui.title, {textAlign: 'center'}]}>{user?.name || 'HippoFan'}</Text>
      <View style={[ui.row, {justifyContent: 'center'}]}><Text style={ui.text}>{t.profile.subtitle}</Text><AppIcon name="sprout" size={19}/></View>
      <ProfileStats animalsCollected={animals.length} badgesUnlocked={unlocked}/>
      <Text style={[ui.title, {fontSize: 20}]}>{t.profile.myBadges} {unlocked}/9</Text>
      <Text style={[ui.text, {fontSize: 12}]}>{t.profile.badgeHint}</Text>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
        {badges.map(badge => <Pressable key={badge.name} accessibilityRole="button"
          accessibilityLabel={`${badge.name}, ${badge.unlocked ? t.profile.unlocked : t.profile.locked}, ${badge.value}/${badge.total}. ${t.profile.viewMissions}`}
          onPress={() => setSelected(badge.name)} style={[ui.card, {width: '31%', padding: 9, alignItems: 'center', gap: 7, backgroundColor: badge.unlocked ? '#FFF4DF' : colors.sand}]}>
          <BadgeArtwork name={badge.name} locked={!badge.unlocked}/>
          <Text style={[ui.text, {fontSize: 10, textAlign: 'center', minHeight: 26}]}>{badge.name}</Text>
          <Text style={{fontSize: 10, fontFamily: badge.unlocked ? typography.bold : typography.regular, color: badge.unlocked ? '#708A49' : '#94877E'}}>{badge.unlocked ? t.profile.unlocked : t.profile.locked}</Text>
          <View style={{height: 6, width: '100%', borderRadius: 9, backgroundColor: '#E5D8CD', overflow: 'hidden'}}>
            <View style={{height: 6, width: `${badge.value / badge.total * 100}%`, backgroundColor: colors.pink}}/>
          </View>
          <Text style={{fontSize: 10, fontFamily: typography.medium, color: colors.ink}}>{badge.value}/{badge.total}</Text>
        </Pressable>)}
      </View>
      {store.collections.some(item => !item.animalType || item.animalType === 'Unknown') && <View style={ui.banner}>
        <Text style={ui.text}>{t.profile.unknownWarning}</Text>
      </View>}
      <Pressable accessibilityRole="button" style={ui.card} onPress={() => nav.navigate('Onboarding', {review: true})}>
        <View style={ui.row}><AppIcon name="help" color="#9E6C52"/><Text style={[ui.text, {fontFamily: typography.bold, flex: 1}]}>{t.settings.howToPlay}</Text><AppIcon name="chevron-right" size={18}/></View>
      </Pressable>
    </ScrollView>
    <BadgeMissionSheet badge={badges.find(badge => badge.name === selected)} onClose={() => setSelected(undefined)}
      onGallery={() => {setSelected(undefined); nav.navigate('MainTabs', {screen: 'Gallery'});}}
      onCapture={() => {setSelected(undefined); nav.navigate('MainTabs', {screen: 'Catch'});}}
      onOpenCollection={id => {setSelected(undefined); nav.navigate('AnimalDetail', {animalId: id});}}/>
  </SafeAreaView>;
}
