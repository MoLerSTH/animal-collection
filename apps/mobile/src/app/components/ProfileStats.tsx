import { PrivateImage as Image } from './PrivateImage';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './Design';

export default function ProfileStats({animalsCollected, badgesUnlocked}: {
  animalsCollected: number;
  badgesUnlocked: number;
}) {
  return (
    <View style={styles.row}>
      <View accessible accessibilityLabel={`${animalsCollected} Animals Collected`} style={styles.card}>
        <View style={styles.iconFrame}>
          <Image source={require('../../../assets/icons/animals-collected.png')} style={styles.icon} resizeMode="contain" accessible={false}/>
        </View>
        <View style={styles.text}>
          <Text style={styles.value}>{animalsCollected}</Text>
          <Text style={styles.label}>Animals Collected</Text>
        </View>
      </View>
      <View accessible accessibilityLabel={`${badgesUnlocked} Badges Unlocked`} style={styles.card}>
        <View style={styles.iconFrame}>
          <Image source={require('../../../assets/icons/badges-unlocked.png')} style={styles.icon} resizeMode="contain" accessible={false}/>
        </View>
        <View style={styles.text}>
          <Text style={styles.value}>{badgesUnlocked}</Text>
          <Text style={styles.label}>Badges Unlocked</Text>
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
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: '#F0E1CE',
    borderRadius: 16,
  },
  // The supplied PNGs have transparent margins. Display them slightly larger
  // inside a fixed frame so their visible artwork matches the design's scale.
  iconFrame: {width: 40, height: 46, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  icon: {width: 56, height: 56},
  text: {flex: 1, alignItems: 'center', gap: 3},
  value: {fontSize: 18, lineHeight: 22, fontWeight: '800', color: colors.ink, textAlign: 'center'},
  label: {fontSize: 10, lineHeight: 14, fontWeight: '500', color: colors.ink, textAlign: 'center'},
});
