import React from 'react';
import { MainTabParamList } from '../navigation/types';
import { CameraIcon, GalleryIcon, UserIcon } from './CatalogIcons';

export function TabIcon({name, color, size = 26}: {name: keyof MainTabParamList; color: string; size?: number}) {
  switch (name) {
    case 'Gallery': return <GalleryIcon color={color} size={size}/>;
    case 'Catch': return <CameraIcon color={color} size={size}/>;
    case 'User': return <UserIcon color={color} size={size}/>;
  }
}
