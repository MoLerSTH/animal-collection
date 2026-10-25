import { PrivateImage as Image } from './PrivateImage';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { colors, typography, Hippo, HippoFigure } from './Design';

function Sparkle({x, y, size = 8}: {x: number; y: number; size?: number}) {
  return <Path d={`M${x} ${y-size} Q${x+1} ${y-1} ${x+size} ${y} Q${x+1} ${y+1} ${x} ${y+size} Q${x-1} ${y+1} ${x-size} ${y} Q${x-1} ${y-1} ${x} ${y-size}`} fill="#F2BD5C" />;
}

export function TutorialArt({step}: {step: 0 | 1 | 2}) {
  return <View accessible accessibilityRole="image" accessibilityLabel={['Hippo holding a camera', 'Discover an animal card', 'Hippo collecting a heart card'][step]} style={styles.tutorial}>
    <Svg width="100%" height="100%" viewBox="0 0 120 112">
      <Ellipse cx="60" cy="103" rx="46" ry="6" fill="#F0E3CD" />
      <Path d="M10 98 Q0 77 8 78 Q19 79 15 102 M15 102 Q15 82 23 88 Q30 95 15 102" fill="#B4BE85" />
      <Sparkle x={105} y={28} size={7}/><Sparkle x={22} y={17} size={4}/>
      {step === 1 ? <G rotation={-10} origin="60,60">
        <Rect x="23" y="19" width="68" height="82" rx="6" fill="#E8CFAB"/>
        <Rect x="29" y="13" width="68" height="82" rx="6" fill="#FFFCF7" stroke="#BE9C79" strokeWidth="2"/>
        <Rect x="35" y="20" width="56" height="56" rx="3" fill="#F5E2C6"/>
        <G transform="translate(33 22) scale(.42)"><HippoFigure/></G>
        <Path d="M45 85 H81" stroke="#9D6C52" strokeWidth="3" strokeLinecap="round"/>
      </G> : <>
        <G transform="translate(8 7) scale(.72)"><HippoFigure/></G>
        {step === 0 ? <G rotation={8} origin="83,76">
          <Rect x="56" y="61" width="52" height="34" rx="7" fill="#8D6E57" stroke="#674936" strokeWidth="2"/>
          <Rect x="62" y="55" width="19" height="9" rx="3" fill="#8D6E57" stroke="#674936" strokeWidth="2"/>
          <Circle cx="85" cy="78" r="12" fill="#C3B39C" stroke="#674936" strokeWidth="3"/>
          <Circle cx="85" cy="78" r="7" fill="#617878"/><Circle cx="88" cy="75" r="2" fill="#D8F0ED"/>
          <Rect x="62" y="67" width="8" height="4" rx="1" fill="#F4DEB5"/>
        </G> : <G rotation={8} origin="80,83">
          <Rect x="60" y="62" width="37" height="40" rx="5" fill="#FFF5E5" stroke="#AC8365" strokeWidth="2"/>
          <Path d="M78 90 L67 79 C61 68 73 65 78 74 C84 65 96 69 90 79Z" fill={colors.pink}/>
        </G>}
      </>}
    </Svg>
  </View>;
}

export function Crown({size = 18}: {size?: number}) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Legendary">
    <Path d="M3 7 L8 12 L12 4 L16 12 L21 7 L18 19 H6Z" fill="#EAB94E" stroke="#B7832D" strokeWidth="1.4" strokeLinejoin="round"/>
  </Svg>;
}

export function StarterGiftArt({photoUri}: {photoUri?: string}) {
  const [imageFailed, setImageFailed] = useState(false);
  return <View style={styles.giftArt}>
    <Svg width="100%" height="100%" viewBox="0 0 300 190" style={StyleSheet.absoluteFill}>
      <Ellipse cx="150" cy="178" rx="118" ry="9" fill="#F4E2BD"/>
      <Sparkle x={33} y={53} size={8}/><Sparkle x={261} y={60} size={10}/>
      <Sparkle x={25} y={129} size={6}/><Sparkle x={275} y={143} size={7}/>
      <Sparkle x={80} y={17} size={5}/><Sparkle x={230} y={22} size={5}/>
      <G rotation={-15} origin="82,127">
        <Rect x="38" y="108" width="86" height="63" rx="6" fill="#F6A5B0" stroke="#DA8294" strokeWidth="2"/>
        <Rect x="34" y="103" width="94" height="17" rx="4" fill="#F7B5BD" stroke="#DA8294" strokeWidth="2"/>
        <Rect x="72" y="104" width="17" height="67" fill="#EF8398"/>
        <Path d="M80 104 C36 101 47 68 68 84 L80 104 C113 61 133 109 80 104" fill="#F7B5BD" stroke="#DA8294" strokeWidth="3"/>
      </G>
      <Path d="M95 117 L235 108 L220 177 H105Z" fill="#EE8CA1" stroke="#D6778D" strokeWidth="2"/>
      <Path d="M93 115 L232 105 L249 123 L111 136Z" fill="#F9B6C0" stroke="#D6778D" strokeWidth="2"/>
      <Path d="M153 131 L176 129 L174 177 H154Z" fill="#FDD2D1"/>
    </Svg>
    <View style={styles.polaroid}>
      {photoUri && !imageFailed ? <Image source={{uri: photoUri}} onError={() => setImageFailed(true)} resizeMode="cover" style={styles.photo}/> : <View style={styles.photoFallback}><Hippo size={78}/></View>}
      <View style={styles.caption}><Crown size={11}/><Text style={styles.captionText}>Hippopotamus</Text></View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  tutorial: {width: '100%', height: 96},
  giftArt: {width: '100%', height: 180, marginVertical: 2},
  polaroid: {position: 'absolute', top: 14, left: '34%', width: '36%', padding: 5, paddingBottom: 9, backgroundColor: '#FFFAED', borderRadius: 5, borderWidth: 2, borderColor: '#EEDBAF', transform: [{rotate: '-9deg'}], shadowColor: '#765036', shadowOffset: {width: 0, height: 4}, shadowOpacity: .17, shadowRadius: 5, elevation: 4},
  photo: {width: '100%', aspectRatio: 1, borderRadius: 3, backgroundColor: '#F2E4CD'},
  photoFallback: {width: '100%', aspectRatio: 1, borderRadius: 3, backgroundColor: '#F2E4CD', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  caption: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 5},
  captionText: {fontFamily: typography.bold, fontSize: 8, color: colors.ink, flexShrink: 1},
});
