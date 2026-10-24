import React from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

export type AppIconName = 'back' | 'chevron-right' | 'close' | 'calendar' | 'book' | 'crown' | 'share' | 'sprout' | 'help' | 'flash' | 'switch-camera' | 'tools' | 'edit' | 'paw' | 'sparkles' | 'settings' | 'logout' | 'mail' | 'check' | 'lock';

export default function AppIcon({name, size = 22, color = '#4A3022'}: {name: AppIconName; size?: number; color?: string}) {
  const stroke = {stroke: color, strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  let artwork: React.ReactNode;
  switch (name) {
    case 'check': artwork = <Path d="M4 12 L9 18 L21 5" {...stroke}/>; break;
    case 'lock': artwork = <><Rect x="4" y="10" width="16" height="12" rx="3" {...stroke}/><Path d="M7 10 V7 A5 5 0 0 1 17 7 V10" {...stroke}/><Circle cx="12" cy="16" r="1.5" fill={color}/></>; break;
    case 'settings': artwork = <>
      <Path d="M10 2 H14 L15 5 L17 6 L20 5 L22 9 L20 11 V13 L22 15 L20 19 L17 18 L15 19 L14 22 H10 L9 19 L7 18 L4 19 L2 15 L4 13 V11 L2 9 L4 5 L7 6 L9 5Z" {...stroke}/>
      <Circle cx="12" cy="12" r="3.5" {...stroke}/>
    </>; break;
    case 'logout': artwork = <><Path d="M10 3 H4 V21 H10 M9 12 H22 M17 7 L22 12 L17 17" {...stroke}/></>; break;
    case 'mail': artwork = <><Rect x="2" y="4" width="20" height="16" rx="3" {...stroke}/><Path d="M3 6 L12 13 L21 6" {...stroke}/></>; break;
    case 'back': artwork = <Path d="M20 12 H4 M10 5 L3 12 L10 19" {...stroke}/>; break;
    case 'chevron-right': artwork = <Path d="M9 5 L16 12 L9 19" {...stroke}/>; break;
    case 'close': artwork = <Path d="M5 5 L19 19 M19 5 L5 19" {...stroke}/>; break;
    case 'calendar': artwork = <>
      <Rect x="3" y="5" width="18" height="17" rx="2" fill="#FFF9E9" stroke="#A57759" strokeWidth="1.7"/>
      <Path d="M3 6 Q3 5 5 5 H19 Q21 5 21 7 V10 H3Z" fill="#E7877A"/>
      <Path d="M7 2 V7 M17 2 V7" stroke="#855F49" strokeWidth="2" strokeLinecap="round"/>
      <Path d="M7 14 H10 M14 14 H17 M7 18 H10 M14 18 H17" stroke="#A57759" strokeWidth="1.7"/>
    </>; break;
    case 'book': artwork = <>
      <Path d="M12 5 Q7 1 2 4 V20 Q7 17 12 21 Q17 17 22 20 V4 Q17 1 12 5Z" fill="#EABDA3" stroke="#9E6C52" strokeWidth="1.7"/>
      <Path d="M5 6 Q8 5 10 7 V17 Q7 15 5 16Z M14 7 Q17 5 19 6 V16 Q17 15 14 17Z" fill="#FFF5DB"/>
      <Path d="M12 5 V21" stroke="#9E6C52" strokeWidth="1.5"/>
    </>; break;
    case 'crown': artwork = <>
      <Path d="M3 7 L8 12 L12 4 L16 12 L21 7 L18 19 H6Z" fill="#F4C45E" stroke="#B7852E" strokeWidth="1.5" strokeLinejoin="round"/>
      <Path d="M7 16 H17" stroke="#FFE7A1" strokeWidth="2"/>
    </>; break;
    case 'share': artwork = <>
      <Path d="M7 11 L17 6 M7 13 L17 18" {...stroke}/>
      <Circle cx="5" cy="12" r="3" fill={color}/><Circle cx="19" cy="4" r="3" fill={color}/><Circle cx="19" cy="20" r="3" fill={color}/>
    </>; break;
    case 'sprout': artwork = <>
      <Path d="M12 22 V12" stroke="#718C4A" strokeWidth="2" strokeLinecap="round"/>
      <Path d="M12 14 C3 14 2 8 3 4 C11 3 14 8 12 14Z" fill="#A1BD72" stroke="#718C4A" strokeWidth="1.3"/>
      <Path d="M12 11 C12 4 17 2 22 3 C23 9 18 13 12 11Z" fill="#BAD18C" stroke="#718C4A" strokeWidth="1.3"/>
    </>; break;
    case 'help': artwork = <>
      <Circle cx="12" cy="12" r="10" fill={color}/>
      <Path d="M9 8 C9 4 17 4 16 9 C15.7 11.3 12 11 12 14" stroke="#FFF9EE" strokeWidth="2" strokeLinecap="round"/>
      <Circle cx="12" cy="18" r="1.2" fill="#FFF9EE"/>
    </>; break;
    case 'flash': artwork = <Path d="M14 2 L4 14 H11 L9 22 L20 9 H13Z" fill={color}/>; break;
    case 'switch-camera': artwork = <>
      <Path d="M3 8 H6 L8 5 H16 L18 8 H21 V21 H3Z" {...stroke}/>
      <Path d="M8 13 A4 4 0 0 1 16 12 M16 12 V9 M16 12 H13 M16 16 A4 4 0 0 1 8 17 M8 17 V20 M8 17 H11" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </>; break;
    case 'edit': artwork = <>
      <Path d="M4 16 L16 4 L20 8 L8 20 L3 21Z M14 6 L18 10" {...stroke}/>
    </>; break;
    case 'tools': artwork = <>
      <Path d="M13 4 A6 6 0 0 0 6 11 L2 17 Q0 21 4 22 Q6 22 7 19 L12 13 A6 6 0 0 0 20 5 L16 9 L12 7Z" {...stroke}/>
    </>; break;
    case 'paw': artwork = <G fill={color}>
      <Ellipse cx="5" cy="9" rx="2.5" ry="3.4" rotation={-25} origin="5,9"/>
      <Ellipse cx="10" cy="5" rx="2.6" ry="3.5"/><Ellipse cx="16" cy="5" rx="2.6" ry="3.5"/>
      <Ellipse cx="21" cy="10" rx="2.3" ry="3.3" rotation={25} origin="21,10"/>
      <Path d="M5 19 C5 15 9 10 13 10 C17 10 21 15 21 19 C21 24 16 21 13 21 C9 21 5 24 5 19Z"/>
    </G>; break;
    case 'sparkles': artwork = <G fill={color}>
      <Path d="M12 1 Q13 10 22 11 Q13 12 12 21 Q11 12 2 11 Q11 10 12 1Z"/>
      <Path d="M21 16 L22 19 L25 20 L22 21 L21 24 L20 21 L17 20 L20 19Z"/>
    </G>; break;
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>{artwork}</Svg>;
}

export function MysteryMarkerIcon({size = 44}: {size?: number}) {
  return <Svg width={size} height={size} viewBox="0 0 36 44" fill="none" accessible={false}>
    <Path d="M18 42 C12 34 2 26 2 17 A16 16 0 0 1 34 17 C34 26 24 34 18 42Z" fill="#82776D" stroke="#FFFDF7" strokeWidth="2.5"/>
    <Path d="M13 12 C13 6 25 6 24 13 C23 17 18 16 18 21" stroke="#FFFDF7" strokeWidth="3" strokeLinecap="round"/>
    <Circle cx="18" cy="27" r="1.7" fill="#FFFDF7"/>
  </Svg>;
}
