import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { getHealthNotice } from '../constants/health';
import { getStatusMessage } from '../features/leaderboard/scoreMessages';
import { AppStackParamList } from '../navigation/navigationTypes';
import { leaderboardService } from '../services/leaderboardService';
import { t } from '../i18n';
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
          <Text style={styles.body}>{t('leaderboard.breakdown.loadFailed')}</Text>
          <AppButton title={t('common.actions.tryAgain')} onPress={load} variant="secondary" />
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
        <Text style={styles.heroLabel}>{period === 'weekly' ? t('leaderboard.breakdown.weekly') : t('leaderboard.breakdown.monthly')}</Text>
        {isScored ? (
          <Text style={styles.heroValue}>{t('leaderboard.breakdown.points', { points: breakdown.totalScore })}</Text>
        ) : (
          <Text style={styles.heroMessage}>{getStatusMessage(breakdown.statusReason)}</Text>
        )}
      </AppCard>

      {isScored ? (
        <AppCard style={styles.stack}>
          <ProgressBar label={t('leaderboard.breakdown.weightProgress')} current={Math.round(breakdown.progressScore ?? 0)} target={100} />
          {/* Weight scores 0 until the first weigh-in after the starting weight. */}
          {breakdown.currentWeightKg === undefined ? (
            <Text style={styles.note}>{t('leaderboard.breakdown.noWeighIn')}</Text>
          ) : null}
          {breakdown.countedLossKg !== undefined &&
          breakdown.actualLossKg !== undefined &&
          breakdown.countedLossKg < breakdown.actualLossKg ? (
            <Text style={styles.note}>
              {t('leaderboard.breakdown.countedLoss', {
                actual: formatKg(breakdown.actualLossKg),
                explained: formatKg(breakdown.explainedLossKg ?? 0),
                counted: formatKg(breakdown.countedLossKg),
              })}
            </Text>
          ) : null}
          {breakdown.adherenceScore === null ? (
            <Text style={styles.note}>{t('leaderboard.breakdown.noMealsDue')}</Text>
          ) : (
            <ProgressBar label={t('leaderboard.breakdown.mealLogging')} current={Math.round(breakdown.adherenceScore)} target={100} />
          )}
          {breakdown.waterScore == null ? null : (
            <ProgressBar label={t('leaderboard.breakdown.water')} current={Math.round(breakdown.waterScore)} target={100} />
          )}
          {breakdown.coffeeScore == null ? null : (
            <ProgressBar label={t('leaderboard.breakdown.coffee')} current={Math.round(breakdown.coffeeScore)} target={100} />
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
        <Text style={styles.noticeTitle}>{t('leaderboard.breakdown.howTitle')}</Text>
        <Text style={styles.noticeText}>
          {t('leaderboard.breakdown.howBody')}
        </Text>
        {multiplier ? <Text style={styles.noticeText}>{t('leaderboard.breakdown.bonus', { multiplier })}</Text> : null}
        <Text style={styles.noticeText}>
          {t('leaderboard.breakdown.noExtra')}
        </Text>
        <Text style={styles.noticeText}>{getHealthNotice()}</Text>
      </AppCard>
    </ScreenContainer>
  );
}

function getDetails(breakdown: ScoreBreakdown) {
  const details: { label: string; value: string }[] = [];

  if (breakdown.baselineWeightKg !== undefined) {
    details.push({ label: t('leaderboard.breakdown.details.start'), value: formatKg(breakdown.baselineWeightKg) });
  }
  if (breakdown.currentWeightKg !== undefined) {
    details.push({ label: t('leaderboard.breakdown.details.current'), value: formatKg(breakdown.currentWeightKg) });
  }
  if (breakdown.expectedLossKg !== undefined) {
    details.push({ label: t('leaderboard.breakdown.details.expected'), value: formatKg(breakdown.expectedLossKg) });
  }
  if (breakdown.actualLossKg !== undefined) {
    details.push({ label: t('leaderboard.breakdown.details.actual'), value: formatKg(breakdown.actualLossKg) });
  }
  if (breakdown.deficitKcal !== undefined) {
    details.push({ label: t('leaderboard.breakdown.details.deficit'), value: `${Math.round(breakdown.deficitKcal)} kcal` });
  }
  if (breakdown.explainedLossKg !== undefined) {
    details.push({ label: t('leaderboard.breakdown.details.explained'), value: formatKg(breakdown.explainedLossKg) });
  }
  if (breakdown.countedLossKg !== undefined) {
    details.push({ label: t('leaderboard.breakdown.details.counted'), value: formatKg(breakdown.countedLossKg) });
  }
  if (breakdown.totalActivities > 0) {
    details.push({ label: t('leaderboard.breakdown.details.meals'), value: t('leaderboard.breakdown.details.mealsValue', { done: breakdown.completedActivities, total: breakdown.totalActivities }) });
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
