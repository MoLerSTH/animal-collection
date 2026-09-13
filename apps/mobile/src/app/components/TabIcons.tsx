import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
  focused?: boolean;
}

// 1. Gallery Icon (Open Book)
export function BookIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 19.2C6.4 17.8 9.3 17.8 12 19.2M12 19.2C14.7 17.8 17.6 17.8 20 19.2M12 19.2V5.5M4 19.2V5.5C6.4 4.1 9.3 4.1 12 5.5M20 19.2V5.5C17.6 4.1 14.7 4.1 12 5.5"
        stroke={color}
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 2. Catch Icon (Compass / Navigation)
export function CompassIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth={2.1} />
      <Path
        d="M15.2 8.8L13.1 14.5L9.5 10.9L15.2 8.8Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// 3. User Icon (Profile circle)
export function UserCircleIcon({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9.5" stroke={color} strokeWidth={2.1} />
      <Circle cx="12" cy="9" r="3.2" stroke={color} strokeWidth={2} />
      <Path
        d="M6.6 18.2C7.8 15.6 9.7 14.5 12 14.5C14.3 14.5 16.2 15.6 17.4 18.2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// Wrapper ที่แสดงวงกลมไฮไลต์สีชมพูพีชเมื่อ active ตามดีไซน์
export function TabBarIconWrapper({
  children,
  focused,
}: {
  children: React.ReactNode;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: '#FBE4DC', // วงกลมพื้นหลังชมพูพีชตาม design
  },
});
