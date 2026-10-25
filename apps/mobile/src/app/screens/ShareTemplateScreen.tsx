import { PrivateImage as Image } from '../components/PrivateImage';
import React, { useState, useRef } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Share, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import AppIcon from '../components/AppIcon';
import { InstagramIcon, FacebookIcon, XIcon, LineIcon, MoreIcon } from '../components/ShareIcons';
import { ui, colors, Hippo, typography } from '../components/Design';
export default function ShareTemplateScreen({
  route,
  navigation
}: NativeStackScreenProps<RootStackParamList, 'ShareTemplate'>) {
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const store = useCollectionStore();
  const animal = store.getAnimalById(route.params.animalId);
  const [editing, setEditing] = useState(false);
  const [customCaption, setCaption] = useState<string | null>(null);
  const caption = customCaption ?? animal?.name ?? 'My discovery';
  const share = async () => {
    if (sharing) return;
    setSharing(true);
    let exported: string | undefined;
    try {
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        exported = await captureRef(cardRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile'
        });
        await Sharing.shareAsync(exported, {
          mimeType: 'image/png',
          dialogTitle: 'Share Your Discovery',
          UTI: 'public.png'
        });
      } else await Share.share({
        title: 'Animal Collection',
        message: `${caption}\nDiscovered with Animal Collection!`,
        ...(animal?.imageUri ? {
          url: animal.imageUri
        } : {})
      });
    } catch {
      Alert.alert('Share unavailable', 'Please try again.');
    } finally {
      if (exported) releaseCapture(exported);
      setSharing(false);
    }
  };
  const destinations = [
    {label: 'Instagram', color: '#D34B91', icon: <InstagramIcon size={28}/>},
    {label: 'Facebook', color: '#357AE8', icon: <FacebookIcon size={28}/>},
    {label: 'X', color: '#252525', icon: <XIcon size={26}/>},
    {label: 'LINE', color: '#25C957', icon: <LineIcon size={34}/>},
    {label: 'More', color: '#DED7D0', icon: <MoreIcon size={27}/>},
  ];
  return (
    <SafeAreaView style={ui.page}>
      <View style={[ui.row, {padding: 20}]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12} onPress={() => navigation.goBack()}><AppIcon name="back"/></Pressable>
        <Text style={[ui.title, {fontSize: 19}]}>Share Your Discovery</Text>
      </View>
      <ScrollView contentContainerStyle={[ui.content, {flexGrow: 1, justifyContent: 'center'}]}>
        {animal ? <View ref={cardRef} collapsable={false} style={{backgroundColor: 'white', padding: 14, paddingBottom: 24, transform: [{rotate: '-4deg'}], shadowColor: colors.ink, shadowOpacity: .15, shadowRadius: 10, elevation: 4, margin: 12}}>
          <View style={{width: 85, height: 28, backgroundColor: '#E9CFABAA', position: 'absolute', top: -14, left: '38%', zIndex: 2, transform: [{rotate: '-5deg'}]}}/>
          {animal.imageUri && <Image source={{uri: animal.imageUri}} style={{width: '100%', aspectRatio: .9}}/>}
          <Pressable accessibilityRole="button" accessibilityLabel="Edit caption" onPress={() => setEditing(!editing)} style={{position: 'absolute', top: 24, right: 24, backgroundColor: 'white', padding: 10, borderRadius: 24}}><AppIcon name="edit" size={18}/></Pressable>
          {editing ? <TextInput accessibilityLabel="Share caption" value={caption} onChangeText={setCaption} onSubmitEditing={() => setEditing(false)} style={[ui.title, {marginTop: 18}]}/> : <Text style={[ui.title, {fontSize: 23, marginTop: 18}]}>{caption}</Text>}
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4}}><Hippo size={42}/><Text style={{fontFamily: typography.bold, fontSize: 11, color: colors.ink}}>Animal{'\n'}Collection</Text></View>
        </View> : <Text style={ui.text}>This discovery could not be found.</Text>}
      </ScrollView>
      <View style={{padding: 22, gap: 18}}>
        <Text style={[ui.title, {fontSize: 20, textAlign: 'center'}]}>Share to</Text>
        <View style={[ui.row, {justifyContent: 'space-around'}]}>
          {destinations.map(({label, color, icon}) => <Pressable key={label} accessibilityLabel={`Share to ${label}`} onPress={share} disabled={!animal || sharing} style={{alignItems: 'center', gap: 5}}>
            <View style={{width: 46, height: 46, borderRadius: 25, backgroundColor: color, alignItems: 'center', justifyContent: 'center'}}>{icon}</View>
            <Text style={{fontFamily: typography.regular, fontSize: 10, color: colors.ink}}>{label}</Text>
          </Pressable>)}
        </View>
        <Text style={{fontFamily: typography.regular, fontSize: 11, textAlign: 'center', color: colors.ink}}>Choose an installed app from your device’s share sheet.</Text>
      </View>
    </SafeAreaView>
  );
}
