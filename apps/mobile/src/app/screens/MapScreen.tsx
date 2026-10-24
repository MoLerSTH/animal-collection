import { PrivateImage as Image } from '../components/PrivateImage';
import AppIcon, { MysteryMarkerIcon } from '../components/AppIcon';
import { LocationIcon } from '../components/CatalogIcons';
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Ellipse, Circle } from 'react-native-svg';
import { useCollectionStore } from '../../features/collections/stores/useCollectionStore';
import { getApiBaseUrl } from '../../features/collections/api/collectionApi';
import { useAuthStore } from '../../features/auth/stores/useAuthStore';
import { authenticatedFetch } from '../../core/api/authenticatedFetch';
import { ui, colors } from '../components/Design';
export default function MapScreen() {
  const [radar, setRadar] = useState(false);
  const [sightings, setSightings] = useState<{
    latitude: number;
    longitude: number;
    speciesCount: number;
  }[]>([]);
  const [radarError, setRadarError] = useState('');
  useEffect(() => {
    if (!radar) return;
    let cancelled = false;
    const token = useAuthStore.getState().tokens?.accessToken;
    setRadarError('');
    authenticatedFetch(`${getApiBaseUrl()}/api/v1/discovery/radar`, {
      headers: token ? {
        Authorization: `Bearer ${token}`
      } : {}
    }).then(r => {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(data => {
      if (!cancelled) setSightings(data);
    }).catch(() => {
      if (!cancelled) setRadarError('โหลดข้อมูลชุมชนไม่ได้ กรุณาลองอีกครั้ง');
    });
    return () => {
      cancelled = true;
    };
  }, [radar]);
  const [selected, setSelected] = useState('Chiang Mai Zoo');
  const store = useCollectionStore();
  const animals = store.getGalleryGrid().filter(a => !a.isLocked);
  return <SafeAreaView edges={['top']} style={ui.page}><View style={[ui.row, {
      padding: 14
    }]}>{['My Captures\n(ที่ฉันเคยพบ)', 'Community Radar\n(ที่คนอื่นพบ)'].map((s, i) => <Pressable key={s} onPress={() => setRadar(!!i)} style={[ui.chip, {
        flex: 1
      }, radar === !!i && ui.active]}><Text style={{
          textAlign: 'center',
          color: radar === !!i ? 'white' : colors.ink,
          fontWeight: '700'
        }}>{s}</Text></Pressable>)}</View><View style={{
      flex: 1,
      backgroundColor: '#DDEAC8',
      overflow: 'hidden'
    }}><Svg width="100%" height="100%" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice"><Path d="M70 0 Q320 170 150 300 T220 640" stroke="#FFF3D7" strokeWidth="38" fill="none" /><Path d="M0 370 Q170 200 220 420 T400 510" stroke="#A4DCD8" strokeWidth="28" fill="none" />{Array.from({
          length: 28
        }, (_, i) => <Circle key={i} cx={i * 83 % 360} cy={i * 137 % 640} r={12 + i % 3 * 5} fill={i % 2 ? '#B2CEA0' : '#91BA8B'} />)}<Ellipse cx="180" cy="280" rx="65" ry="42" fill="#F4DAB4" /></Svg><Text style={{
        position: 'absolute',
        top: '42%',
        left: '35%',
        color: colors.ink,
        fontWeight: '700'
      }}>Chiang Mai Zoo</Text>{animals.map((a, i) => <Pressable accessibilityLabel={a.name} key={a.id} onPress={() => setSelected(a.name)} style={{
        position: 'absolute',
        left: `${15 + i * 29 % 65}%`,
        top: `${12 + i * 23 % 65}%`,
        backgroundColor: 'white',
        padding: 4,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: colors.pink
      }}>{a.imageUri ? <Image source={{
          uri: a.imageUri
        }} style={{
          width: 46,
          height: 46,
          borderRadius: 25
        }} /> : <AppIcon name="paw" color="#9E6C52" size={36}/>}</Pressable>)}{radar && sightings.map((sighting, index) => <View key={index} style={{
        position: 'absolute',
        left: `${15 + index * 23 % 70}%`,
        top: `${10 + index * 21 % 65}%`,
        alignItems: 'center'
      }}><MysteryMarkerIcon/></View>)}<View style={[ui.card, {
        position: 'absolute',
        bottom: 18,
        left: 14,
        right: 14
      }]}><View style={ui.row}><LocationIcon color={colors.pink} size={24}/><Text style={[ui.text, {fontWeight: '700', flex: 1}]}>{selected}</Text><AppIcon name="chevron-right" size={18}/></View><Text style={ui.text}>{radar ? radarError || `Community Radar — ${sightings.length} พื้นที่ที่มีการค้นพบ` : 'แผนที่ภาพประกอบของคอลเลกชันของคุณ'}</Text></View></View></SafeAreaView>;
}
