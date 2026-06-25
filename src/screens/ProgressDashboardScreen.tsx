import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../components/AppCard';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { formatDateLabel } from '../utils/date';
import { formatKg } from '../utils/formatters';

export function ProgressDashboardScreen() {
  const entries = useProgressStore((state) => state.entries);
  const latestEntry = useProgressStore((state) => state.latestEntry());
  const previousEntry = entries.length > 1 ? entries[entries.length - 2] : undefined;
  const weightDelta = latestEntry && previousEntry ? latestEntry.weightKg - previousEntry.weightKg : 0;

  return (
    <ScreenContainer>
      <SectionHeader
        title="Progress dashboard"
        subtitle="Charts are intentionally lightweight placeholders. The data model is ready to swap to an analytics API or richer charting package later."
      />

      <View style={styles.metricsRow}>
        <AppCard style={styles.metricCard}>
          <Text style={styles.metricLabel}>Current weight</Text>
          <Text style={styles.metricValue}>{latestEntry ? formatKg(latestEntry.weightKg) : '--'}</Text>
        </AppCard>
        <AppCard style={styles.metricCard}>
          <Text style={styles.metricLabel}>Week delta</Text>
          <Text style={styles.metricValue}>{weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg</Text>
        </AppCard>
      </View>

      <AppCard style={styles.stack}>
        <ProgressBar label="Weekly consistency" current={latestEntry?.weeklyConsistency ?? 0} target={100} suffix="%" />
        <ProgressBar label="Goal progress" current={latestEntry?.goalProgress ?? 0} target={100} suffix="%" />
      </AppCard>

      {entries.map((entry) => (
        <AppCard key={entry.id} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryDate}>{formatDateLabel(entry.date)}</Text>
            <Text style={styles.entryWeight}>{formatKg(entry.weightKg)}</Text>
          </View>
          <Text style={styles.entryMeta}>Consistency {entry.weeklyConsistency}% · Goal progress {entry.goalProgress}%</Text>
          {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
        </AppCard>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '800',
  },
  stack: {
    gap: theme.spacing.lg,
  },
  entryCard: {
    gap: theme.spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entryDate: {
    color: theme.colors.muted,
  },
  entryWeight: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  entryMeta: {
    color: theme.colors.text,
  },
  entryNote: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
});