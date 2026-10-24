import React from 'react';
import Svg, { Path, Rect, Circle, G, Defs, ClipPath } from 'react-native-svg';

interface IconProps {
  color?: string;
  size?: number;
}

// Instagram icon (camera outline with circle)
export function InstagramIcon({ color = '#FFFFFF', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="2" width="20" height="20" rx="5" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={2} />
      <Circle cx="17.5" cy="6.5" r="1.5" fill={color} />
    </Svg>
  );
}

// TikTok icon (music note style)
export function TikTokIcon({ color = '#FFFFFF', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 12C9 13.66 7.66 15 6 15C4.34 15 3 13.66 3 12C3 10.34 4.34 9 6 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M9 3V12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M9 3C9 3 12 3 15 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Facebook icon (f letter)
export function FacebookIcon({ color = '#FFFFFF', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 2H15C13.34 2 12 3.34 12 5V8H9V12H12V22H16V12H19L20 8H16V5C16 4.45 16.45 4 17 4H20V2H18Z"
        fill={color}
      />
    </Svg>
  );
}

// Gallery / Add to Gallery icon (image with plus)
export function GalleryAddIcon({ color = '#FFFFFF', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="3" stroke={color} strokeWidth={2} />
      <Circle cx="8.5" cy="8.5" r="1.5" fill={color} />
      <Path
        d="M3 16L8 11L11 14L15 9L21 16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function XIcon({color = '#FFFFFF', size = 22}: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
    <Path d="M4 3 H9 L20 21 H15Z" stroke={color} strokeWidth="1.6"/>
    <Path d="M19 3 L5 21" stroke={color} strokeWidth="1.6"/>
  </Svg>;
}

export function LineIcon({size = 30}: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}>
    <Path d="M29 14 C29 7 23 3 16 3 C8 3 3 7 3 14 C3 20 8 24 14 25 L13 29 Q24 25 28 18Z" fill="white"/>
    <G stroke="#25C957" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <Path d="M7 11 V17 H10 M13 11 V17 M16 17 V11 L20 17 V11 M26 11 H23 V17 H26 M23 14 H26"/>
    </G>
  </Svg>;
}

export function MoreIcon({color = '#6D5140', size = 26}: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
    <Circle cx="5" cy="12" r="2" fill={color}/><Circle cx="12" cy="12" r="2" fill={color}/><Circle cx="19" cy="12" r="2" fill={color}/>
  </Svg>;
}
