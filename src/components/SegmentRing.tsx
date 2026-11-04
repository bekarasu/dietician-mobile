import { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { theme } from '../theme/theme';

export interface RingSegment {
  value: number;
  max: number;
  color: string;
}

interface SegmentRingProps extends PropsWithChildren {
  segments: RingSegment[];
  size?: number;
  strokeWidth?: number;
}

// A ring split into one arc per segment, each as long as its share of the total
// maximum and filled in proportion to its value. Children sit in the middle.
export function SegmentRing({ segments, size = 148, strokeWidth = 12, children }: SegmentRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const totalMax = segments.reduce((sum, segment) => sum + segment.max, 0) || 1;
  // Round caps reach half a stroke past each end, so gaps allow for both.
  const gap = segments.length > 1 ? strokeWidth * 1.6 : 0;

  let offset = 0;
  const arcs = segments.map((segment, index) => {
    const length = Math.max((circumference * segment.max) / totalMax - gap, 0);
    const filled = length * Math.min(Math.max(segment.value / (segment.max || 1), 0), 1);
    const start = offset;
    offset += length + gap;
    return { key: index, color: segment.color, length, filled, start };
  });

  const circle = (key: string, color: string, length: number, start: number, opacity = 1) => (
    <Circle
      key={key}
      cx={size / 2}
      cy={size / 2}
      r={radius}
      fill="none"
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={`${length} ${circumference}`}
      strokeDashoffset={-start}
    />
  );

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {arcs.map((arc) => circle(`track-${arc.key}`, arc.color, arc.length, arc.start, 0.15))}
          {/* A zero-length arc with round caps would still draw a dot. */}
          {arcs.filter((arc) => arc.filled > 0).map((arc) => circle(`fill-${arc.key}`, arc.color, arc.filled, arc.start))}
        </G>
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
});
