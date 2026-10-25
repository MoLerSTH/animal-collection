import { PrivateImage as Image } from './PrivateImage';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from './Design';
import { useTranslation } from '../../core/i18n/useLanguageStore';

export default function ProfileStats({animalsCollected, badgesUnlocked}: {
  animalsCollected: number;
  badgesUnlocked: number;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <View accessible accessibilityLabel={`${animalsCollected} ${t.profile.animalsCollected}`} style={styles.card}>
        <View style={styles.iconFrame}>
          <Image source={require('../../../assets/icons/animals-collected.png')} style={styles.icon} resizeMode="contain" accessible={false}/>
        </View>
        <View style={styles.text}>
          <Text style={styles.value}>{animalsCollected}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.label}>{t.profile.animalsCollected}</Text>
        </View>
      </View>
      <View accessible accessibilityLabel={`${badgesUnlocked} ${t.profile.badgesUnlocked}`} style={styles.card}>
        <View style={styles.iconFrame}>
          <Image source={require('../../../assets/icons/badges-unlocked.png')} style={styles.icon} resizeMode="contain" accessible={false}/>
        </View>
        <View style={styles.text}>
          <Text style={styles.value}>{badgesUnlocked}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.label}>{t.profile.badgesUnlocked}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 10, width: '100%'},
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 76,
    paddingHorizontal: 9,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(74, 48, 34, 0.08)',
    borderRadius: 20,
    shadowColor: '#4A3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  // The supplied PNGs have transparent margins. Display them slightly larger
  // inside a fixed frame so their visible artwork matches the design's scale.
  iconFrame: {width: 40, height: 46, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  icon: {width: 56, height: 56},
  text: {flex: 1, alignItems: 'center', gap: 3},
  value: {fontSize: 20, lineHeight: 24, fontFamily: typography.extraBold, color: colors.ink, textAlign: 'center'},
  label: {fontSize: 11, lineHeight: 15, fontFamily: typography.medium, color: '#8A7568', textAlign: 'center'},
});
