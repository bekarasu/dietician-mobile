import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { leaderboardService } from '../services/leaderboardService';
import { useHydrationStore } from '../store/useHydrationStore';
import { t } from '../i18n';
import { theme } from '../theme/theme';
import { DayPoints } from '../types/models';
import { formatDecimal } from '../utils/formatters';
import { toCalendarDate } from '../utils/date';

export function HydrationTrackingScreen() {
  const hydration = useHydrationStore((state) => state.hydration);
  const coffee = useHydrationStore((state) => state.coffee);
  const addWater = useHydrationStore((state) => state.addWater);
  const addCoffee = useHydrationStore((state) => state.addCoffee);
  const [todayPoints, setTodayPoints] = useState<DayPoints | null>(null);

  // The server sets both targets from weight and age. The score uses the latest
  // weigh-in, so its water target leads the profile's until the profile reloads.
  const loadTodayPoints = useCallback(async () => {
    const today = toCalendarDate(new Date());
    try {
      const points = await leaderboardService.getDailyPoints(today, today);
      setTodayPoints(points.days[0] ?? null);
    } catch (e) {
      setTodayPoints(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTodayPoints();
    }, [loadTodayPoints]),
  );

  const logWater = async (amount: number) => {
    await addWater(amount);
    loadTodayPoints();
  };

  const logCoffee = async (cups: number) => {
    await addCoffee(cups);
    loadTodayPoints();
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title={t('hydration.title')}
        subtitle={t('hydration.subtitle')}
      />

      {todayPoints?.status === 'IN_PROGRESS' ? (
        <AppCard style={styles.stack}>
          <Text style={styles.cardTitle}>{t('hydration.todayPoints')}</Text>
          <Text style={styles.scoreText}>
            {t('hydration.waterPoints', {
              points: todayPoints.waterPoints,
              max: todayPoints.maxWaterPoints,
              target: formatDecimal(todayPoints.waterTargetMl / 1000),
            })}
          </Text>
          <Text style={styles.scoreText}>
            {t('hydration.coffeePoints', { points: todayPoints.coffeePoints, max: todayPoints.maxCoffeePoints, limit: todayPoints.coffeeLimitCups })}
          </Text>
          <Text style={styles.scoreNote}>{t('hydration.noExtra')}</Text>
        </AppCard>
      ) : null}

      <AppCard style={styles.stack}>
        <Text style={styles.cardTitle}>{t('hydration.hydration')}</Text>
        <ProgressBar label={t('hydration.waterIntake')} current={hydration.waterMl} target={hydration.targetWaterMl} suffix={t('common.units.mlSuffix')} />
        <View style={styles.actions}>
          <AppButton title="+250 ml" onPress={() => logWater(250)} />
          <AppButton title="+500 ml" variant="secondary" onPress={() => logWater(500)} />
        </View>
      </AppCard>

      <AppCard style={styles.stack}>
        <Text style={styles.cardTitle}>{t('hydration.coffee')}</Text>
        <ProgressBar label={t('hydration.coffeeCups')} current={coffee.cups} target={coffee.targetCups} suffix={t('common.units.cupsSuffix')} />
        <View style={styles.actions}>
          <AppButton title={t('common.units.addCups', { count: 1 })} onPress={() => logCoffee(1)} />
          <AppButton title={t('common.units.addCups', { count: 2 })} variant="secondary" onPress={() => logCoffee(2)} />
        </View>
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  scoreText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  scoreNote: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});
