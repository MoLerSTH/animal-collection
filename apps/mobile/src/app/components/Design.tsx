import React from 'react';
import Svg, { Ellipse, Circle, Path, G } from 'react-native-svg';
import { Text, Pressable, StyleSheet, View, Platform } from 'react-native';

export const typography = {
  fontFamily: 'Kanit_400Regular',
  regular: 'Kanit_400Regular',
  medium: 'Kanit_500Medium',
  semiBold: 'Kanit_600SemiBold',
  bold: 'Kanit_700Bold',
  extraBold: 'Kanit_800ExtraBold',
};

export const colors = {
  cream: '#FDF8F2',
  white: '#FFFFFF',
  sand: '#F7EFE6',
  ink: '#4A3022',
  pink: '#E06D79',
  blush: '#FBE1DE',
  gold: '#EDB64E'
};

export const ui = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.cream
  },
  content: {
    padding: 20,
    gap: 16
  },
  title: {
    fontFamily: typography.extraBold,
    fontSize: 27,
    color: colors.ink
  },
  text: {
    fontFamily: typography.regular,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.sand
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  chip: {
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.sand
  },
  active: {
    backgroundColor: colors.pink
  },
  banner: {
    backgroundColor: colors.blush,
    padding: 16,
    borderRadius: 16
  },
  button: {
    backgroundColor: colors.pink,
    padding: 15,
    borderRadius: 28,
    alignItems: 'center'
  },
  buttonText: {
    fontFamily: typography.bold,
    color: 'white',
    fontSize: 16
  }
});

export function Button({
  label,
  onPress,
  disabled = false,
  icon
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[ui.button, disabled && {
    opacity: 0.5
  }]}><View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7}}>{icon}<Text style={ui.buttonText}>{label}</Text></View></Pressable>;
}

/** Shared vector mascot: independent of the device's emoji fonts. */
export function HippoFigure() {
  return <G>
    <Ellipse cx="72" cy="102" rx="42" ry="29" fill="#F4A5AE" stroke="#99625D" strokeWidth="2" />
    <Circle cx="43" cy="35" r="12" fill="#F4A5AE" stroke="#99625D" strokeWidth="2" />
    <Circle cx="94" cy="35" r="12" fill="#F4A5AE" stroke="#99625D" strokeWidth="2" />
    <Circle cx="43" cy="35" r="6" fill="#E7798B" /><Circle cx="94" cy="35" r="6" fill="#E7798B" />
    <Path d="M30 69 Q24 28 69 28 Q111 25 112 74 Q124 115 75 116 Q23 119 30 69" fill="#F6ADB7" stroke="#99625D" strokeWidth="2" />
    <Ellipse cx="70" cy="88" rx="39" ry="25" fill="#F8BBC0" />
    <Circle cx="48" cy="58" r="3.5" fill="#4A3022" /><Circle cx="91" cy="58" r="3.5" fill="#4A3022" />
    <Ellipse cx="48" cy="80" rx="3" ry="4" fill="#B97C7A" /><Ellipse cx="90" cy="80" rx="3" ry="4" fill="#B97C7A" />
    <Path d="M53 100 Q70 110 88 99" fill="none" stroke="#99625D" strokeWidth="2" />
    <Ellipse cx="38" cy="70" rx="8" ry="4" fill="#EA8C9C" /><Ellipse cx="102" cy="70" rx="8" ry="4" fill="#EA8C9C" />
  </G>;
}

export function Hippo({size = 100, magnifier = false}: {size?: number; magnifier?: boolean}) {
  return <View accessibilityLabel="Hippo mascot" style={{alignItems: 'center'}}>
    <Svg width={size} height={size} viewBox="0 0 140 140">
      <HippoFigure />
      {magnifier && <>
        <Path d="M42 110 L28 136" stroke="#926851" strokeWidth="9" />
        <Circle cx="49" cy="97" r="22" fill="#A8DAE5" stroke="#926851" strokeWidth="5" />
        <Path d="M39 89 Q45 82 55 85" fill="none" stroke="white" strokeWidth="4" />
      </>}
    </Svg>
  </View>;
}
