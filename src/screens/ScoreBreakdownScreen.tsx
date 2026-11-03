import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { HEALTH_NOTICE } from '../constants/health';
import { getStatusMessage } from '../features/leaderboard/scoreMessages';
import { AppStackParamList } from '../navigation/navigationTypes';
import { leaderboardService } from '../services/leaderboardService';
import { theme } from '../theme/theme';
import { ScoreBreakdown } from '../types/models';
import { formatKg } from '../utils/formatters';

export function ScoreBreakdownScreen() {
  const { period, periodStart } = useRoute<RouteProp<AppStackParamList, 'ScoreBreakdown'>>().params;
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    setBreakdown(null);
    try {
      setBreakdown(await leaderboardService.getScoreBreakdown(period, periodStart));
    } catch {
      setFailed(true);
    }
  }, [period, periodStart]);

  useEffect(() => {
    load();
  }, [load]);

  if (failed) {
    return (
      <ScreenContainer>
        <AppCard style={styles.stack}>
          <Text style={styles.body}>We couldn't load your score. Please try again.</Text>
          <AppButton title="Try again" onPress={load} variant="secondary" />
        </AppCard>
      </ScreenContainer>
    );
  }

  if (!breakdown) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const isScored = breakdown.calculationStatus === 'CALCULATED';
  const { multiplier, details } = getDetails(breakdown);

  return (
    <ScreenContainer>
      <AppCard style={styles.heroCard}>
        <Text style={styles.heroLabel}>{period === 'weekly' ? 'Weekly score' : 'Monthly score'}</Text>
        {isScored ? (
          <Text style={styles.heroValue}>{breakdown.totalScore} points</Text>
        ) : (
          <Text style={styles.heroMessage}>{getStatusMessage(breakdown.statusReason)}</Text>
        )}
      </AppCard>

      {isScored ? (
        <AppCard style={styles.stack}>
          <ProgressBar label="Weight progress" current={Math.round(breakdown.progressScore ?? 0)} target={100} />
          {/* Weight scores 0 until the first weigh-in after the starting weight. */}
          {breakdown.currentWeightKg === undefined ? (
            <Text style={styles.note}>No weigh-in yet this period. Log your weight to earn weight points.</Text>
          ) : null}
          {breakdown.adherenceScore === null ? (
            <Text style={styles.note}>Meal logging: no meals due yet.</Text>
          ) : (
            <ProgressBar label="Meal logging" current={Math.round(breakdown.adherenceScore)} target={100} />
          )}
          {breakdown.waterScore == null ? null : (
            <ProgressBar label="Water" current={Math.round(breakdown.waterScore)} target={100} />
          )}
          {breakdown.coffeeScore == null ? null : (
            <ProgressBar label="Coffee within your limit" current={Math.round(breakdown.coffeeScore)} target={100} />
          )}
        </AppCard>
      ) : null}

      {details.length > 0 ? (
        <AppCard>
          {details.map((detail) => (
            <View key={detail.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{detail.label}</Text>
              <Text style={styles.detailValue}>{detail.value}</Text>
            </View>
          ))}
        </AppCard>
      ) : null}

      <AppCard style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>How your score works</Text>
        <Text style={styles.noticeText}>
          55% comes from your weight progress against a safe expected pace, 30% from logging breakfast, lunch and
          dinner, 10% from drinking water towards a target based on your weight, and 5% from keeping coffee within
          your limit on days you log water. Only you can see these details: others only see your total score.
        </Text>
        {multiplier ? <Text style={styles.noticeText}>Your program difficulty adds a bonus of {multiplier}.</Text> : null}
        <Text style={styles.noticeText}>
          Losing weight faster than the expected pace, or drinking more than your water target, doesn't earn extra points.
        </Text>
        <Text style={styles.noticeText}>{HEALTH_NOTICE}</Text>
      </AppCard>
    </ScreenContainer>
  );
}

function getDetails(breakdown: ScoreBreakdown) {
  const details: { label: string; value: string }[] = [];

  if (breakdown.baselineWeightKg !== undefined) {
    details.push({ label: 'Starting weight', value: formatKg(breakdown.baselineWeightKg) });
  }
  if (breakdown.currentWeightKg !== undefined) {
    details.push({ label: 'Current weight', value: formatKg(breakdown.currentWeightKg) });
  }
  if (breakdown.expectedLossKg !== undefined) {
    details.push({ label: 'Expected change', value: formatKg(breakdown.expectedLossKg) });
  }
  if (breakdown.actualLossKg !== undefined) {
    details.push({ label: 'Your change', value: formatKg(breakdown.actualLossKg) });
  }
  if (breakdown.totalActivities > 0) {
    details.push({ label: 'Meals logged', value: `${breakdown.completedActivities} of ${breakdown.totalActivities}` });
  }

  const hasBonus = breakdown.difficultyMultiplier !== undefined && breakdown.difficultyMultiplier > 1;
  return { details, multiplier: hasBonus ? `×${breakdown.difficultyMultiplier}` : null };
}

const styles = StyleSheet.create({
  stack: {
    gap: theme.spacing.lg,
  },
  body: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: theme.colors.primary,
  },
  heroLabel: {
    color: theme.colors.surface,
    opacity: 0.8,
    marginBottom: theme.spacing.sm,
  },
  heroValue: {
    color: theme.colors.surface,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '800',
  },
  heroMessage: {
    color: theme.colors.surface,
    lineHeight: 22,
  },
  note: {
    color: theme.colors.muted,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  detailLabel: {
    color: theme.colors.muted,
  },
  detailValue: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  noticeCard: {
    backgroundColor: theme.colors.secondarySurface,
    gap: theme.spacing.sm,
  },
  noticeTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  noticeText: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
});
