import React from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { ANIMAL_TYPES, AnimalType, HabitatTag } from '../../features/collections/types';
import { colors, ui } from './Design';

export default function IdentificationFields({ species, animalType, tags, onSpecies, onType, onTags }: {
  species: string;
  animalType: AnimalType;
  tags: HabitatTag[];
  onSpecies: (value: string) => void;
  onType: (value: AnimalType) => void;
  onTags: (value: HabitatTag[]) => void;
}) {
  return <View style={[ui.card, {gap: 10}]}>
    <Text style={[ui.text, {fontWeight: '700'}]}>ข้อมูลสัตว์สำหรับภารกิจ</Text>
    <Text style={[ui.text, {fontSize: 12}]}>แยกจากชื่อเล่นของการ์ด ระบุเท่าที่ทราบ หากยังไม่แน่ใจให้เลือก Unknown</Text>
    <TextInput accessibilityLabel="Identified species" placeholder="ชนิดสัตว์ เช่น Goldfish" value={species} onChangeText={onSpecies} style={[ui.chip, ui.text]}/>
    <Text style={ui.text}>ประเภทสัตว์</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
      {ANIMAL_TYPES.map(type => <Pressable key={type} accessibilityRole="button" accessibilityLabel={`Type ${type}`} accessibilityState={{selected: animalType === type}}
        onPress={() => onType(type)} style={[ui.chip, animalType === type && ui.active]}>
        <Text style={[ui.text, animalType === type && {color: colors.white}]}>{type}</Text>
      </Pressable>)}
    </ScrollView>
    <Text style={ui.text}>ถิ่นอาศัยของสัตว์ (เลือกได้หลายข้อ)</Text>
    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
      {(['aquatic', 'mountain', 'safari'] as const).map(tag => <Pressable key={tag} accessibilityRole="checkbox" accessibilityLabel={`Habitat ${tag}`} accessibilityState={{checked: tags.includes(tag)}}
        onPress={() => onTags(tags.includes(tag) ? tags.filter(value => value !== tag) : [...tags, tag])} style={[ui.chip, tags.includes(tag) && ui.active]}>
        <Text style={[ui.text, tags.includes(tag) && {color: colors.white}]}>{tag === 'aquatic' ? 'Aquatic · สัตว์น้ำ' : tag === 'mountain' ? 'Mountain · ภูเขา' : 'Safari · ซาฟารี'}</Text>
      </Pressable>)}
    </View>
  </View>;
}
