import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Achievement } from '../data/achievements';
import BadgeArtwork from './BadgeArtwork';
import AppIcon from './AppIcon';
import { Button, colors, ui, typography } from './Design';
import { useTranslation } from '../../core/i18n/useLanguageStore';

export default function BadgeMissionSheet({ badge, onClose, onCapture, onGallery, onOpenCollection }: {
  badge: Achievement | undefined;
  onClose: () => void;
  onCapture: () => void;
  onGallery: () => void;
  onOpenCollection: (id: string) => void;
}) {
  const { t, language } = useTranslation();
  if (!badge) return null;

  const m = t.badgeMission;
  const description = (language === 'en' && m.descriptions[badge.name]) ? m.descriptions[badge.name] : badge.description;
  const note = (language === 'en' && m.notes[badge.name]) ? m.notes[badge.name] : badge.note;

  const getRemainingText = () => {
    if (badge.unlocked) return m.allCompleted;
    if (language === 'en') {
      let unitStr = m.unitSpecies;
      if (badge.unit === 'ภาพ') unitStr = badge.remaining === 1 ? m.unitPhotosSingular : m.unitPhotos;
      else if (badge.unit === 'ประเภท') unitStr = badge.remaining === 1 ? m.unitTypesSingular : m.unitTypes;
      else if (badge.unit === 'วัน') unitStr = badge.remaining === 1 ? m.unitDaysSingular : m.unitDays;
      return `${badge.remaining} ${unitStr} ${m.remainingText}`;
    }
    return `เหลืออีก ${badge.remaining} ${badge.unit} ${m.remainingText}`;
  };

  const getMissionLabel = (mission: { id: string; label: string; collectionId?: string }, index: number) => {
    if (mission.collectionId || language === 'th') {
      return mission.label;
    }
    const match = mission.label.match(/\d+/);
    const num = match ? match[0] : `${index + 1}`;
    if (badge.unit === 'ชนิด') return `${m.pendingSpecies}${num}`;
    if (badge.unit === 'ประเภท') return `${m.pendingClass}${num}`;
    if (badge.unit === 'ภาพ') return `${m.pendingPhoto}${num}`;
    if (badge.unit === 'วัน') return `${m.pendingDay}${num}`;
    return `Target #${num}`;
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#4A302266' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close badge details" onPress={onClose} style={{ flex: 1, minHeight: 40 }} />
        <SafeAreaView edges={['bottom']} accessibilityViewIsModal style={{ backgroundColor: colors.cream, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' }}>
          <ScrollView contentContainerStyle={[ui.content, { gap: 14 }]}>
            <View style={ui.row}>
              <Text accessibilityRole="header" style={[ui.title, { flex: 1, fontSize: 23 }]}>{badge.name}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Dismiss badge details" onPress={onClose} style={{ padding: 12 }}>
                <AppIcon name="close" />
              </Pressable>
            </View>
            <View style={{ alignItems: 'center' }}>
              <BadgeArtwork name={badge.name} locked={!badge.unlocked} />
            </View>
            <Text style={[ui.text, { textAlign: 'center', fontFamily: typography.bold, color: badge.unlocked ? '#708A49' : colors.pink }]}>
              {badge.unlocked ? m.unlockedStatus : m.lockedStatus}
            </Text>
            <Text style={[ui.text, { fontFamily: typography.bold }]}>{description}</Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={`${badge.name} progress`}
              accessibilityValue={{ min: 0, max: badge.total, now: badge.value }}
              style={{ height: 10, borderRadius: 10, backgroundColor: '#E5D8CD', overflow: 'hidden' }}
            >
              <View style={{ height: 10, width: `${(badge.value / badge.total) * 100}%`, backgroundColor: colors.pink }} />
            </View>
            <Text style={[ui.text, { fontFamily: typography.regular }]}>
              {badge.value}/{badge.total} · {getRemainingText()}
            </Text>
            <Text style={[ui.text, { fontFamily: typography.bold }]}>{m.missionChecklist}</Text>
            {badge.missions.map((mission, index) => {
              const displayLabel = getMissionLabel(mission, index);
              return (
                <Pressable
                  key={mission.id}
                  disabled={!mission.collectionId}
                  accessibilityRole={mission.collectionId ? 'button' : undefined}
                  accessibilityLabel={`${mission.done ? 'Completed' : 'Pending'}: ${displayLabel}`}
                  onPress={() => mission.collectionId && onOpenCollection(mission.collectionId)}
                  style={[ui.card, ui.row, { padding: 12, backgroundColor: mission.done ? '#F1F5E7' : colors.white }]}
                >
                  <AppIcon name={mission.done ? 'check' : 'lock'} size={20} color={mission.done ? '#708A49' : '#94877E'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[ui.text, { fontFamily: typography.bold }]}>{displayLabel}</Text>
                    <Text style={[ui.text, { fontSize: 12, fontFamily: typography.regular }]}>
                      {mission.done ? m.done : m.notDone}
                    </Text>
                  </View>
                  {!!mission.collectionId && <AppIcon name="chevron-right" size={18} />}
                </Pressable>
              );
            })}
            <Text style={[ui.text, { fontSize: 12, fontFamily: typography.regular }]}>{note}</Text>
            <Text style={[ui.text, { fontSize: 12, fontFamily: typography.regular }]}>
              {m.progressCalculation}
            </Text>
            <View style={ui.banner}>
              <Text style={[ui.text, { fontSize: 12, fontFamily: typography.regular }]}>
                {m.legacyCardsBanner}
              </Text>
            </View>
            {!badge.unlocked && (
              <Button
                label={badge.name === 'Zoo Lover' ? m.actionFavorite : m.actionCapture}
                onPress={badge.name === 'Zoo Lover' ? onGallery : onCapture}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
