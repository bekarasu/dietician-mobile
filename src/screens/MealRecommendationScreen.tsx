import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { AI_GUIDANCE_NOTICE } from '../constants/health';
import { buildRecommendationNarrative } from '../features/recommendations/recommendationContext';
import { recommendationService } from '../services/recommendationService';
import { useDailyLogStore } from '../store/useDailyLogStore';
import { useHydrationStore } from '../store/useHydrationStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useProfileStore } from '../store/useProfileStore';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { MealRecommendation } from '../types/models';

export function MealRecommendationScreen() {
  const profile = useProfileStore((state) => state.profile);
  const dailyLogs = useDailyLogStore((state) => state.logs);
  const inventory = useInventoryStore((state) => state.items);
  const entries = useProgressStore((state) => state.entries);
  const hydration = useHydrationStore((state) => state.hydration);
  const coffee = useHydrationStore((state) => state.coffee);

  const [recommendation, setRecommendation] = useState<MealRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canGenerate = Boolean(profile);
  const narrative = profile
    ? buildRecommendationNarrative({
        goalType: profile.goalType,
        dietaryPreferences: profile.dietaryPreferences,
        dailyLogs,
        inventory,
        progress: entries,
        hydration,
        coffee,
      })
    : null;

  const generateRecommendation = async () => {
    if (!profile) {
      return;
    }

    setIsLoading(true);

    const result = await recommendationService.generateRecommendation({
      goalType: profile.goalType,
      dietaryPreferences: profile.dietaryPreferences,
      dailyLogs,
      inventory,
      progress: entries,
      hydration,
      coffee,
    });

    setRecommendation(result);
    setIsLoading(false);
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title="Meal recommendation"
        subtitle="The service is deliberately isolated so the mock generator can be replaced later with an AI provider or backend orchestration layer."
      />

      <AppCard style={styles.stack}>
        <Text style={styles.contextTitle}>Recommendation context</Text>
        <Text style={styles.contextLine}>{narrative?.goalSummary ?? 'Loading profile context...'}</Text>
        <Text style={styles.contextLine}>{narrative?.inventorySummary ?? 'Loading inventory context...'}</Text>
        <Text style={styles.contextLine}>{narrative?.behaviorSummary ?? 'Loading behavior context...'}</Text>
        <AppButton disabled={!canGenerate} loading={isLoading} title="Generate mock recommendation" onPress={generateRecommendation} />
      </AppCard>

      {recommendation ? (
        <AppCard style={styles.stack}>
          <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
          <Text style={styles.recommendationSummary}>{recommendation.summary}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested meals</Text>
            {recommendation.meals.map((meal) => (
              <Text key={meal} style={styles.bulletLine}>• {meal}</Text>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why this plan</Text>
            {recommendation.rationale.map((reason) => (
              <Text key={reason} style={styles.bulletLine}>• {reason}</Text>
            ))}
          </View>

          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>{recommendation.disclaimer}</Text>
          </View>
        </AppCard>
      ) : null}

      <AppCard style={styles.noticeBox}>
        <Text style={styles.noticeText}>{AI_GUIDANCE_NOTICE}</Text>
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: theme.spacing.md,
  },
  contextTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  contextLine: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
  recommendationTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '800',
  },
  recommendationSummary: {
    color: theme.colors.text,
    lineHeight: 24,
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  bulletLine: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
  noticeBox: {
    backgroundColor: theme.colors.secondarySurface,
  },
  noticeText: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
});