import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, FeColorMatrix, Filter, Image as SvgImage } from 'react-native-svg';

// Keep the supplied transparent atlas unchanged; each view shows one grid cell.
const atlas = require('../../../assets/badges/animal-badges-atlas.png');
const cellSize = 418; // The original atlas is 1254 × 1254, arranged in three rows.
const badgeCells = {
  Explorer: [0, 0],
  'Zoo Lover': [1, 0],
  'Rare Finder': [2, 0],
  'Photo Pro': [0, 1],
  'Night Owl': [1, 1],
  'Aquatic Friend': [2, 1],
  'Mountain Climber': [0, 2],
  'Bird Watcher': [1, 2],
  'Safari Master': [2, 2],
} as const;

export type BadgeName = keyof typeof badgeCells;

export default function BadgeArtwork({name, locked}: {name: BadgeName; locked: boolean}) {
  const [column, row] = badgeCells[name];
  const filterId = `badge-muted-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${name} badge${locked ? ', locked' : ', unlocked'}`} style={styles.frame}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${cellSize} ${cellSize}`}>
        {locked && <Defs>
          <Filter id={filterId} x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
            <FeColorMatrix type="saturate" values="0"/>
          </Filter>
        </Defs>}
        <SvgImage href={atlas} x={-column * cellSize} y={-row * cellSize} width={1254} height={1254}
          filter={locked ? `url(#${filterId})` : undefined} opacity={locked ? 0.45 : 1}/>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {width: '100%', maxWidth: 100, aspectRatio: 1, alignSelf: 'center', overflow: 'hidden'},
});
