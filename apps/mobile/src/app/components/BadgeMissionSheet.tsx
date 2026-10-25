import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Achievement } from '../data/achievements';
import BadgeArtwork from './BadgeArtwork';
import AppIcon from './AppIcon';
import { Button, colors, ui, typography } from './Design';

export default function BadgeMissionSheet({ badge, onClose, onCapture, onGallery, onOpenCollection }: {
  badge: Achievement | undefined;
  onClose: () => void;
  onCapture: () => void;
  onGallery: () => void;
  onOpenCollection: (id: string) => void;
}) {
  if (!badge) return null;
  return <Modal transparent animationType="slide" visible onRequestClose={onClose}>
    <View style={{flex: 1, justifyContent: 'flex-end', backgroundColor: '#4A302266'}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close badge details" onPress={onClose} style={{flex: 1, minHeight: 40}}/>
      <SafeAreaView edges={['bottom']} accessibilityViewIsModal style={{backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%'}}>
        <ScrollView contentContainerStyle={[ui.content, {gap: 14}]}>
          <View style={ui.row}>
            <Text accessibilityRole="header" style={[ui.title, {flex: 1, fontSize: 23}]}>{badge.name}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss badge details" onPress={onClose} style={{padding: 12}}><AppIcon name="close"/></Pressable>
          </View>
          <View style={{alignItems: 'center'}}><BadgeArtwork name={badge.name} locked={!badge.unlocked}/></View>
          <Text style={[ui.text, {textAlign: 'center', fontFamily: typography.bold, color: badge.unlocked ? '#708A49' : colors.pink}]}>{badge.unlocked ? 'Unlocked · สำเร็จแล้ว!' : 'Locked · ยังไม่สำเร็จ'}</Text>
          <Text style={[ui.text, {fontFamily: typography.bold}]}>{badge.description}</Text>
          <View accessibilityRole="progressbar" accessibilityLabel={`${badge.name} progress`} accessibilityValue={{min: 0, max: badge.total, now: badge.value}}
            style={{height: 10, borderRadius: 10, backgroundColor: '#E5D8CD', overflow: 'hidden'}}>
            <View style={{height: 10, width: `${badge.value / badge.total * 100}%`, backgroundColor: colors.pink}}/>
          </View>
          <Text style={[ui.text, {fontFamily: typography.regular}]}>{badge.value}/{badge.total} · {badge.unlocked ? 'ภารกิจครบแล้ว เหรียญแสดงเป็นสี' : `เหลืออีก ${badge.remaining} ${badge.unit} เพื่อปลดล็อกเหรียญสี`}</Text>
          <Text style={[ui.text, {fontFamily: typography.bold}]}>รายการภารกิจ</Text>
          {badge.missions.map(mission => <Pressable key={mission.id} disabled={!mission.collectionId} accessibilityRole={mission.collectionId ? 'button' : undefined}
            accessibilityLabel={`${mission.done ? 'Completed' : 'Pending'}: ${mission.label}`}
            onPress={() => mission.collectionId && onOpenCollection(mission.collectionId)}
            style={[ui.card, ui.row, {padding: 12, backgroundColor: mission.done ? '#F1F5E7' : colors.white}]}>
            <AppIcon name={mission.done ? 'check' : 'lock'} size={20} color={mission.done ? '#708A49' : '#94877E'}/>
            <View style={{flex: 1}}><Text style={[ui.text, {fontFamily: typography.bold}]}>{mission.label}</Text><Text style={[ui.text, {fontSize: 12, fontFamily: typography.regular}]}>{mission.done ? 'สำเร็จแล้ว' : 'ยังไม่สำเร็จ'}</Text></View>
            {!!mission.collectionId && <AppIcon name="chevron-right" size={18}/>}
          </Pressable>)}
          <Text style={[ui.text, {fontSize: 12, fontFamily: typography.regular}]}>{badge.note}</Text>
          <Text style={[ui.text, {fontSize: 12, fontFamily: typography.regular}]}>ความคืบหน้าคำนวณจากคอลเลกชันปัจจุบัน การแก้ไขหรือลบการ์ดอาจเปลี่ยนสถานะเหรียญ</Text>
          <View style={ui.banner}><Text style={[ui.text, {fontSize: 12, fontFamily: typography.regular}]}>การ์ดเก่าบางใบอาจยังไม่มีประเภทสัตว์ เปิดการ์ดเพื่อระบุประเภทสัตว์เพิ่มเติมได้ ข้อมูลที่ไม่ทราบจะไม่ถูกเดาเป็นภารกิจที่สำเร็จ</Text></View>
          {!badge.unlocked && <Button label={badge.name === 'Zoo Lover' ? 'เลือกรายการโปรดใน Gallery' : 'ไปถ่ายสัตว์เพิ่ม'} onPress={badge.name === 'Zoo Lover' ? onGallery : onCapture}/>}
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}
