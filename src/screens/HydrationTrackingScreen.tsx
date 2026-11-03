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
import { theme } from '../theme/theme';
import { DayPoints } from '../types/models';
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
        title="Water and coffee tracking"
        subtitle="Your targets are set for you: 30 ml of water per kg of body weight, between 1.5 and 3 L, and at most 4 cups of coffee a day, or 1 under 18."
      />

      {todayPoints?.status === 'IN_PROGRESS' ? (
        <AppCard style={styles.stack}>
          <Text style={styles.cardTitle}>Today's points</Text>
          <Text style={styles.scoreText}>
            Water: {todayPoints.waterPoints} / {todayPoints.maxWaterPoints}, for drinking towards{' '}
            {(todayPoints.waterTargetMl / 1000).toFixed(1)} L, a target based on your weight.
          </Text>
          <Text style={styles.scoreText}>
            Coffee: {todayPoints.coffeePoints} / {todayPoints.maxCoffeePoints}, for at most {todayPoints.coffeeLimitCups}{' '}
            cups on a day you log water.
          </Text>
          <Text style={styles.scoreNote}>Drinking more than the target doesn't earn extra points.</Text>
        </AppCard>
      ) : null}

      <AppCard style={styles.stack}>
        <Text style={styles.cardTitle}>Hydration</Text>
        <ProgressBar label="Water intake" current={hydration.waterMl} target={hydration.targetWaterMl} suffix=" ml" />
        <View style={styles.actions}>
          <AppButton title="+250 ml" onPress={() => logWater(250)} />
          <AppButton title="+500 ml" variant="secondary" onPress={() => logWater(500)} />
        </View>
      </AppCard>

      <AppCard style={styles.stack}>
        <Text style={styles.cardTitle}>Coffee</Text>
        <ProgressBar label="Coffee cups" current={coffee.cups} target={coffee.targetCups} suffix=" cups" />
        <View style={styles.actions}>
          <AppButton title="+1 cup" onPress={() => logCoffee(1)} />
          <AppButton title="+2 cups" variant="secondary" onPress={() => logCoffee(2)} />
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
