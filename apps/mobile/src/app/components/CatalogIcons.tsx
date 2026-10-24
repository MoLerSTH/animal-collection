import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = {color: string; size?: number};

export function SearchIcon({color, size = 18}: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="10.5" cy="10.5" r="6.7" stroke={color} strokeWidth="2.2"/>
    <Path d="M15.5 15.5 L21 21" stroke={color} strokeWidth="2.2" strokeLinecap="round"/>
  </Svg>;
}

export function HeartIcon({color, size = 16}: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 21 L3.4 12.7 C-2 6.5 6.1 -.6 12 6 C17.9 -.6 26 6.5 20.6 12.7Z" fill={color}/>
  </Svg>;
}

export function LocationIcon({color, size = 16, filled = true}: IconProps & {filled?: boolean}) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22 S3.7 14.4 3.7 9 A8.3 8.3 0 0 1 20.3 9 C20.3 14.4 12 22 12 22Z"
      fill={filled ? color : 'none'} stroke={color} strokeWidth={filled ? 0 : 1.9} strokeLinejoin="round"/>
    <Circle cx="12" cy="9" r="3" fill={filled ? '#FDF8F2' : 'none'} stroke={filled ? 'none' : color} strokeWidth="1.8"/>
  </Svg>;
}

export function GalleryIcon({color, size = 26}: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.9"/>
    <Circle cx="8" cy="8" r="1.6" fill={color}/>
    <Path d="M3 17 L8.4 11.8 L12 15.3 L15.7 11.5 L21 17" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>;
}

export function CameraIcon({color, size = 26}: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6.5 H7 L8.5 3.5 H15.5 L17 6.5 H21 V20.5 H3Z" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
    <Circle cx="12" cy="13.2" r="4.1" stroke={color} strokeWidth="1.9"/>
  </Svg>;
}

export function UserIcon({color, size = 26}: IconProps) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="6.8" r="4" stroke={color} strokeWidth="1.9"/>
    <Path d="M4 21 V18.8 C4 11.7 20 11.7 20 18.8 V21Z" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
  </Svg>;
}
