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
