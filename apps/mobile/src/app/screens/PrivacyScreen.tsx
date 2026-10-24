import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import AppIcon from '../components/AppIcon';
import { colors, ui } from '../components/Design';

const sections = [
  ['Your account', 'When you sign in with Google, the app receives your name, email address, profile photo and Google account identifier. These connect your animal collection to your account.'],
  ['Photos and AI analysis', 'Photos you take for identification are sent to the app’s server and an external AI service. Before AI analysis, the image is resized and its EXIF metadata is removed. The selected AI provider (Gemini or OpenAI) applies its own data handling policies. You are asked for consent before the first analysis.'],
  ['Your collection', 'Synced photos, names, notes, capture times and favorites are stored with your account. Cards marked Waiting to sync are still only on this device. The app also keeps a local copy of collection data so you can view saved discoveries when the service is unavailable.'],
  ['Location is optional', 'When you save a discovery, the app can ask for your location. You can decline and still save the animal. Release 1 does not expose the Map or community radar.'],
  ['Sharing', 'Sharing creates an image of your discovery card. You choose which app receives it through your device’s share menu. Images you export or share are controlled separately from your Animal Collection account.'],
  ['Managing your data', 'Signing out keeps your saved collection with your account. Delete account in Settings removes your profile, album, uploaded photos and badge progress. Deleting the app alone does not delete your server account.'],
] as const;

export default function PrivacyScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Privacy'>) {
  const policyUrl = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || (process.env.EXPO_PUBLIC_APP_ENV === 'production' ? `${process.env.EXPO_PUBLIC_API_BASE_URL}/privacy` : undefined);
  return <SafeAreaView style={ui.page}><ScrollView contentContainerStyle={styles.content}>
    <View style={ui.row}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.back}><AppIcon name="back"/></Pressable><Text style={[ui.title,{fontSize:25}]}>Privacy & data</Text></View>
    <Text style={ui.text}>Understand what you share while building your animal collection.</Text>
    {sections.map(([title, text]) => <View key={title} style={ui.card}><Text style={styles.heading}>{title}</Text><Text style={ui.text}>{text}</Text></View>)}
    {!!policyUrl && <Pressable accessibilityRole="link" onPress={() => {
      void Linking.openURL(policyUrl).catch(() => Alert.alert('Could not open privacy policy', 'Please try again later.'));
    }} style={ui.button}><Text style={ui.buttonText}>Read the full privacy policy</Text></Pressable>}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({content:{padding:20,gap:16,paddingBottom:32,maxWidth:520,width:'100%',alignSelf:'center'},back:{padding:12,borderRadius:16,backgroundColor:colors.sand},heading:{fontSize:17,fontWeight:'700',color:colors.ink,marginBottom:8}});
