import AppIcon from '../components/AppIcon';
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { appStorage } from '../../core/storage/mmkv';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import { ui, Button, colors } from '../components/Design';
import { TutorialArt, StarterGiftArt } from '../components/OnboardingArt';
export default function OnboardingScreen({
  route,
  navigation
}: NativeStackScreenProps<RootStackParamList, 'Onboarding'>) {
  const review = route.params?.review;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const finish = () => {
    appStorage.set('hasSeenOnboarding', 'true');
    if (review) navigation.goBack();else if (useAuthStore.getState().isAuthenticated) navigation.replace('MainTabs', {
      screen: 'Gallery'
    });else navigation.replace('Login');
  };
  const claim = async () => {
    setBusy(true);
    try {
      useCollectionStore.getState().claimStarterGift();
      finish();
    } catch {
      setError('Unable to claim gift. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const hippoPhoto = useCollectionStore(state => state.catalog.find(animal => animal.code === 'hippopotamus')?.defaultImageUrl);
  return (
    <SafeAreaView style={ui.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Skip onboarding" onPress={finish} hitSlop={12} style={styles.skip}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
          <Text style={styles.title}>Welcome to{'\n'}Animal Collection</Text>
          <Text style={styles.subtitle}>Photograph, discover and collect{ '\n'}adorable animals around the world!</Text>
        </View>

        <View style={styles.steps}>
          {(['Photograph\nan animal', 'Discover\nits card', 'Collect\nthem all!'] as const).map((label, index) => (
            <View key={label} style={styles.step}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{index + 1}</Text></View>
              <TutorialArt step={index as 0 | 1 | 2}/>
              <Text style={styles.stepLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {review ? <Button label="Let's Explore!" onPress={finish}/> : (
          <View style={styles.giftCard}>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss starter gift" onPress={finish} hitSlop={12} style={styles.close}>
              <AppIcon name="close" size={18} color="#845847"/>
            </Pressable>
            <Text style={styles.giftTitle}>Starter Gift!</Text>
            <Text style={styles.giftDescription}>Get a special animal card to start{ '\n'}your collection!</Text>
            <StarterGiftArt photoUri={hippoPhoto}/>
            {!!error && <Text style={[ui.text, styles.error]} accessibilityRole="alert">{error}</Text>}
            <Button label={busy ? 'Claiming…' : 'Claim Gift'} disabled={busy} onPress={claim}/>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {flexGrow: 1, width: '100%', maxWidth: 460, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 18, gap: 18, justifyContent: 'space-between'},
  header: {alignItems: 'center', gap: 10},
  skip: {alignSelf: 'flex-end', paddingHorizontal: 3, paddingVertical: 8, minHeight: 36},
  skipText: {fontSize: 13, fontWeight: '700', color: colors.ink},
  title: {fontSize: 26, lineHeight: 30, fontWeight: '800', color: colors.ink, textAlign: 'center'},
  subtitle: {fontSize: 13, lineHeight: 18, color: colors.ink, textAlign: 'center', paddingHorizontal: 4},
  steps: {flexDirection: 'row', alignItems: 'flex-start', gap: 5},
  step: {flex: 1, alignItems: 'center', gap: 4},
  stepNumber: {width: 23, height: 23, borderRadius: 12, backgroundColor: colors.pink, alignItems: 'center', justifyContent: 'center'},
  stepNumberText: {fontSize: 14, lineHeight: 18, fontWeight: '800', color: 'white'},
  stepLabel: {fontSize: 11, lineHeight: 15, fontWeight: '700', color: colors.ink, textAlign: 'center', minHeight: 32},
  giftCard: {backgroundColor: '#FFFCF7', borderRadius: 24, borderWidth: 1, borderColor: '#F0DBC5', padding: 18, gap: 8, shadowColor: '#A77951', shadowOffset: {width: 0, height: 4}, shadowOpacity: .15, shadowRadius: 10, elevation: 4},
  close: {position: 'absolute', right: 12, top: 8, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', zIndex: 1},
  closeText: {fontSize: 24, color: '#845847', lineHeight: 27},
  giftTitle: {fontSize: 25, lineHeight: 30, fontWeight: '800', color: colors.ink, textAlign: 'center'},
  giftDescription: {fontSize: 12, lineHeight: 17, color: colors.ink, textAlign: 'center'},
  error: {fontSize: 12, textAlign: 'center'},
});
