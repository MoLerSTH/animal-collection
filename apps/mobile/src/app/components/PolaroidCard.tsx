import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { AnimalItem } from '../types';

interface PolaroidCardProps {
  animal: AnimalItem;
}

export default function PolaroidCard({ animal }: PolaroidCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {animal.imageUri ? (
          <Image source={{ uri: animal.imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderEmoji}>🐾</Text>
          </View>
        )}
      </View>

      <View style={styles.header}>
        <Text style={styles.species}>{animal.species}</Text>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>
            {animal.category}
          </Text>
        </View>
      </View>

      {animal.story ? (
        <View style={styles.storyContainer}>
          <Text style={styles.storyTitle}>Story & Quirks</Text>
          <Text style={styles.storyText} numberOfLines={3}>
            {animal.story}
          </Text>
        </View>
      ) : null}

      <View style={styles.attributesRow}>
        <View style={styles.attributeBox}>
          <Text style={styles.attributeLabel}>Fav Snack</Text>
          <Text style={styles.attributeValue}>{animal.favFood || '—'}</Text>
        </View>
        <View style={styles.attributeBox}>
          <Text style={styles.attributeLabel}>Temperament</Text>
          <Text style={styles.attributeValue}>{animal.temperament || '—'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#C4A484',
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  imageContainer: {
    aspectRatio: 4 / 3,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'rgba(196,164,132,0.3)',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  placeholderContainer: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 48,
  },
  header: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  species: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3A2E2B',
  },
  categoryBadge: {
    borderRadius: 9999,
    backgroundColor: 'rgba(196,164,132,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: 'rgba(58,46,43,0.7)',
  },
  storyContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  storyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(58,46,43,0.7)',
  },
  storyText: {
    marginTop: 2,
    fontSize: 14,
    color: 'rgba(58,46,43,0.9)',
  },
  attributesRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  attributeBox: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(196,164,132,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attributeLabel: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    color: 'rgba(58,46,43,0.6)',
  },
  attributeValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A2E2B',
  },
});
