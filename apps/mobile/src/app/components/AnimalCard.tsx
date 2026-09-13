import React from 'react';
import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { AnimalItem } from '../types';

interface AnimalCardProps {
  animal: AnimalItem;
  onPress?: (animal: AnimalItem) => void;
}

export default function AnimalCard({ animal, onPress }: AnimalCardProps) {
  if (animal.isLocked) {
    return (
      <View style={styles.lockedCard}>
        <View style={styles.lockedBadge} />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${animal.species}`}
      onPress={() => onPress?.(animal)}
      style={styles.card}
    >
      <View style={styles.imageContainer}>
        {animal.imageUri ? (
          <Image source={{ uri: animal.imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🐾</Text>
          </View>
        )}
      </View>
      <Text style={styles.speciesText} numberOfLines={1}>
        {animal.species}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lockedCard: {
    aspectRatio: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(58,46,43,0.1)',
  },
  lockedBadge: {
    height: 32,
    width: 32,
    borderRadius: 9999,
    backgroundColor: 'rgba(58,46,43,0.2)',
  },
  card: {
    width: '100%',
  },
  imageContainer: {
    aspectRatio: 1,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  placeholder: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(196,164,132,0.3)',
  },
  placeholderIcon: {
    fontSize: 30,
  },
  speciesText: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#3A2E2B',
  },
});
