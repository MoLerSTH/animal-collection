import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  Skeleton,
  SkeletonCard,
  SkeletonGalleryGrid,
  SkeletonDetail,
  SkeletonProfile,
} from '../Skeleton';

describe('Skeleton Components', () => {
  it('renders atomic Skeleton with default accessibility and styles', () => {
    render(<Skeleton />);
    const skeleton = screen.getByRole('progressbar');
    expect(skeleton).toBeTruthy();
    expect(skeleton.props.accessibilityLabel).toBe('Loading content…');
    expect(StyleSheet.flatten(skeleton.props.style)).toEqual(
      expect.objectContaining({
        backgroundColor: '#EBE3D7',
      })
    );
  });

  it('renders atomic Skeleton with custom props', () => {
    render(
      <Skeleton
        width={120}
        height={24}
        borderRadius={12}
        testID="custom-skeleton"
        accessibilityLabel="Loading username…"
      />
    );
    const skeleton = screen.getByTestId('custom-skeleton');
    expect(skeleton).toBeTruthy();
    expect(skeleton.props.accessibilityLabel).toBe('Loading username…');
  });

  it('renders SkeletonCard with photo and body shimmer placeholders', () => {
    render(<SkeletonCard />);
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThanOrEqual(3);
  });

  it('renders SkeletonGalleryGrid with default 4 items and custom count', () => {
    const { rerender } = render(<SkeletonGalleryGrid />);
    expect(screen.getByTestId('skeleton-gallery-grid')).toBeTruthy();
    const defaultBars = screen.getAllByRole('progressbar');
    expect(defaultBars.length).toBe(4 * 3); // 3 per card

    rerender(<SkeletonGalleryGrid count={6} />);
    const updatedBars = screen.getAllByRole('progressbar');
    expect(updatedBars.length).toBe(6 * 3);
  });

  it('renders SkeletonDetail layout', () => {
    render(<SkeletonDetail />);
    expect(screen.getByTestId('skeleton-detail')).toBeTruthy();
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(5);
  });

  it('renders SkeletonProfile layout', () => {
    render(<SkeletonProfile />);
    expect(screen.getByTestId('skeleton-profile')).toBeTruthy();
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars.length).toBeGreaterThan(5);
  });
});
