import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { AppCard } from '../components/AppCard';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { HEALTH_NOTICE } from '../constants/health';
import { QuickActionGrid } from '../features/dashboard/components/QuickActionGrid';
import { AppStackParamList } from '../navigation/navigationTypes';
import { useHydrationStore } from '../store/useHydrationStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useProfileStore } from '../store/useProfileStore';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { formatGoalType, formatKg } from '../utils/formatters';

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const profile = useProfileStore((state) => state.profile);
  const latestEntry = useProgressStore((state) => state.latestEntry());
  const hydration = useHydrationStore((state) => state.hydration);
  const coffee = useHydrationStore((state) => state.coffee);
  const onboardingInsight = useOnboardingStore((state) => {
    return (
      state.responses.habits?.message ??
      state.responses.preferences?.message ??
      state.responses.goals?.message ??
      state.responses.basics?.message ??
      null
    );
  });

  return (
    <ScreenContainer>
      <SectionHeader
        title={`Good morning, ${profile?.name ?? 'there'}`}
        subtitle="A steady plan usually beats compensation. Use the quick actions to log behavior and keep the recommendation engine informed."
      />

      <AppCard style={styles.heroCard}>
        <Text style={styles.heroLabel}>Current focus</Text>
        <Text style={styles.heroValue}>{profile ? formatGoalType(profile.goalType) : 'Loading profile'}</Text>
        <Text style={styles.heroMeta}>
          Daily calorie target: {profile?.dailyCalorieTarget ?? 0} kcal
          {'\n'}Target weight: {profile ? formatKg(profile.targetWeightKg) : '--'}
        </Text>
      </AppCard>

      <View style={styles.metricsRow}>
        <Pressable style={styles.metricCard} onPress={() => navigation.navigate('WeightProgress')}>
          <AppCard>
            <Text style={styles.metricLabel}>Current weight</Text>
            <Text style={styles.metricValue}>{latestEntry ? formatKg(latestEntry.weightKg) : '--'}</Text>
          </AppCard>
        </Pressable>
        <AppCard style={styles.metricCard}>
          <Text style={styles.metricLabel}>Weekly consistency</Text>
          <Text style={styles.metricValue}>{latestEntry?.weeklyConsistency ?? 0}%</Text>
        </AppCard>
      </View>

      <AppCard style={styles.stack}>
        <ProgressBar label="Water" current={hydration.waterMl} target={hydration.targetWaterMl} suffix=" ml" />
        <ProgressBar label="Coffee" current={coffee.cups} target={coffee.targetCups} suffix=" cups" />
      </AppCard>

      {onboardingInsight ? (
        <AppCard style={styles.insightCard}>
          <Text style={styles.noticeTitle}>Onboarding insight</Text>
          <Text style={styles.noticeText}>{onboardingInsight}</Text>
        </AppCard>
      ) : null}

      <SectionHeader title="Quick actions" subtitle="Every screen in the requested scope is reachable from here or the bottom tabs." />
      <QuickActionGrid
        actions={[
          {
            id: 'inventory',
            title: 'Inventory',
            description: 'Keep home ingredients available to future meal generation.',
            onPress: () => navigation.navigate('RefrigeratorInventory'),
          },
          {
            id: 'hydration',
            title: 'Water & coffee',
            description: 'Track daily fluid intake and moderate stimulant load.',
            onPress: () => navigation.navigate('HydrationTracking'),
          },
          {
            id: 'friends',
            title: 'Friend challenge',
            description: 'Compare consistency and difficulty-weighted progress.',
            onPress: () => navigation.navigate('FriendCompetition'),
          },
          {
            id: 'blood',
            title: 'Blood tests',
            description: 'Placeholder upload flow with explicit health disclaimers.',
            onPress: () => navigation.navigate('BloodTestUpload'),
          },
          {
            id: 'settings',
            title: 'Settings',
            description: 'Responsible defaults, reminders, and account exit path.',
            onPress: () => navigation.navigate('Settings'),
          },
        ]}
      />

      <AppCard style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>Safety note</Text>
        <Text style={styles.noticeText}>{HEALTH_NOTICE}</Text>
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: theme.spacing.sm,
  },
  heroMeta: {
    color: theme.colors.surface,
    lineHeight: 22,
  },
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
  insightCard: {
    backgroundColor: theme.colors.secondarySurface,
  },
  noticeCard: {
    backgroundColor: theme.colors.secondarySurface,
  },
  noticeTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  noticeText: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
});