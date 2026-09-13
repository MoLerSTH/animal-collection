import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';

interface AttributeBadgeProps {
  label: string;
  value: string;
  style?: StyleProp<ViewStyle>;
}

export default function AttributeBadge({ label, value, style }: AttributeBadgeProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(196, 164, 132, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: 'rgba(58, 46, 43, 0.6)',
  },
  value: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: '#3A2E2B',
  },
});
