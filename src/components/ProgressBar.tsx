import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

interface ProgressBarProps {
  label: string;
  current: number;
  target: number;
  suffix?: string;
}

export function ProgressBar({ label, current, target, suffix = '' }: ProgressBarProps) {
  const safeTarget = target <= 0 ? 1 : target;
  const progress = Math.min(current / safeTarget, 1);
  const percentage = Math.round(progress * 100);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {current}
          {suffix} / {target}
          {suffix}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  value: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  track: {
    height: 10,
    borderRadius: theme.radii.round,
    overflow: 'hidden',
    backgroundColor: theme.colors.secondarySurface,
  },
  fill: {
    height: '100%',
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primary,
  },
});