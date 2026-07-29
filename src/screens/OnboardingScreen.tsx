import { useEffect, useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { HEALTH_NOTICE } from '../constants/health';
import { OnboardingPageRenderer } from '../features/onboarding/OnboardingPageRenderer';
import { ONBOARDING_PAGES } from '../features/onboarding/onboardingPages';
import { useAuthStore } from '../store/useAuthStore';
import { useHydrationStore } from '../store/useHydrationStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useProfileStore } from '../store/useProfileStore';
import { theme } from '../theme/theme';
import { OnboardingDraft, UserProfile } from '../types/models';

import type { OnboardingStackParamList } from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Onboarding'>;

function splitCommaSeparatedList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildProfileFromDraft(draft: OnboardingDraft, profile: UserProfile | null, fallbackName: string) {
  return {
    id: profile?.id ?? 'profile-1',
    name: draft.name.trim() || fallbackName,
    age: Number(draft.age) || profile?.age || 30,
    heightCm: Number(draft.heightCm) || profile?.heightCm || 170,
    weightKg: Number(draft.weightKg) || profile?.weightKg || 70,
    targetWeightKg: Number(draft.targetWeightKg) || profile?.targetWeightKg || 70,
    gender: draft.gender || profile?.gender,
    activityLevel: draft.activityLevel || profile?.activityLevel,
    goalType: draft.goalType,
    dietaryPreferences: draft.dietaryPreferences,
    dislikedFoods: splitCommaSeparatedList(draft.dislikedFoods),
    allergies: splitCommaSeparatedList(draft.allergies),
    dailyCalorieTarget: Number(draft.dailyCalorieTarget) || profile?.dailyCalorieTarget || 2200,
  } satisfies UserProfile;
}

function pageIsValid(draft: OnboardingDraft, pageIndex: number) {
  const page = ONBOARDING_PAGES[pageIndex];

  return page.fields.every((field) => {
    if (!field.required) {
      return true;
    }

    const value = draft[field.id];

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return String(value).trim().length > 0;
  });
}

export function OnboardingScreen(_: Props) {
  const user = useAuthStore((state) => state.user);
  const draft = useOnboardingStore((state) => state.draft);
  const currentPageIndex = useOnboardingStore((state) => state.currentPageIndex);
  const isSubmitting = useOnboardingStore((state) => state.isSubmitting);
  const error = useOnboardingStore((state) => state.error);
  const responses = useOnboardingStore((state) => state.responses);
  const updateField = useOnboardingStore((state) => state.updateField);
  const mergeDraft = useOnboardingStore((state) => state.mergeDraft);
  const goToNextPage = useOnboardingStore((state) => state.goToNextPage);
  const goToPreviousPage = useOnboardingStore((state) => state.goToPreviousPage);
  const submitPage = useOnboardingStore((state) => state.submitPage);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);

  const profile = useProfileStore((state) => state.profile);
  const setProfile = useProfileStore((state) => state.setProfile);
  const hydration = useHydrationStore((state) => state.hydration);
  const coffee = useHydrationStore((state) => state.coffee);
  const setTargets = useHydrationStore((state) => state.setTargets);

  const [showValidation, setShowValidation] = useState(false);

  const currentPage = ONBOARDING_PAGES[currentPageIndex];
  const isLastPage = currentPageIndex === ONBOARDING_PAGES.length - 1;
  const currentResponse = responses[currentPage.id];
  const progressRatio = (currentPageIndex + 1) / ONBOARDING_PAGES.length;

  useEffect(() => {
    const hasStarted =
      draft.name.length > 0 ||
      draft.age.length > 0 ||
      draft.weightKg.length > 0 ||
      draft.targetWeightKg.length > 0 ||
      Object.keys(responses).length > 0;

    if (hasStarted) {
      return;
    }

    mergeDraft({
      name: user?.name ?? profile?.name ?? '',
      age: profile ? String(profile.age) : '',
      heightCm: profile ? String(profile.heightCm) : '',
      weightKg: profile ? String(profile.weightKg) : '',
      targetWeightKg: profile ? String(profile.targetWeightKg) : '',
      gender: profile?.gender ?? '',
      activityLevel: profile?.activityLevel ?? '',
      goalType: profile?.goalType ?? 'habit_building',
      dietaryPreferences: profile?.dietaryPreferences ?? [],
      dislikedFoods: profile?.dislikedFoods.join(', ') ?? '',
      allergies: profile?.allergies?.join(', ') ?? '',
      dailyCalorieTarget: profile ? String(profile.dailyCalorieTarget) : '',
      targetWaterMl: String(hydration.targetWaterMl),
      targetCoffeeCups: String(coffee.targetCups),
    });
  }, [coffee.targetCups, draft.age.length, draft.name.length, draft.targetWeightKg.length, draft.weightKg.length, hydration.targetWaterMl, mergeDraft, profile, responses, user?.name]);

  const latestInsight = useMemo(() => {
    return responses.habits ?? responses.preferences ?? responses.goals ?? responses.basics ?? null;
  }, [responses]);

  const handleContinue = async () => {
    setShowValidation(true);

    if (!pageIsValid(draft, currentPageIndex)) {
      return;
    }

    const response = await submitPage(currentPage.id);

    if (!response) {
      return;
    }

    if (isLastPage) {
      if (response.profile) {
        setProfile(response.profile);
      } else {
        setProfile(buildProfileFromDraft(draft, profile, user?.name ?? 'User'));
      }
      setTargets(Number(draft.targetWaterMl) || hydration.targetWaterMl, Number(draft.targetCoffeeCups) || coffee.targetCups);
      completeOnboarding();
      return;
    }

    setShowValidation(false);
    goToNextPage();
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Reusable onboarding flow</Text>
        <Text style={styles.title}>{currentPage.title}</Text>
        <Text style={styles.subtitle}>{currentPage.subtitle}</Text>
      </View>

      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>
          Step {currentPageIndex + 1} of {ONBOARDING_PAGES.length}
        </Text>
        <Text style={styles.progressCaption}>{currentPage.requestSummary}</Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progressRatio * 100)}%` }]} />
      </View>

      <AppCard style={styles.formCard}>
        <OnboardingPageRenderer
          draft={draft}
          onChange={updateField}
          page={currentPage}
          showValidation={showValidation}
        />
      </AppCard>

      {currentResponse ? (
        <AppCard style={styles.responseCard}>
          <Text style={styles.responseTitle}>Latest sync</Text>
          <Text style={styles.responseText}>{currentResponse.message}</Text>
        </AppCard>
      ) : null}

      {error ? (
        <AppCard style={styles.errorCard}>
          <Text style={styles.responseTitle}>Unable to sync step</Text>
          <Text style={styles.responseText}>{error}</Text>
        </AppCard>
      ) : null}

      <AppCard style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>Health boundary</Text>
        <Text style={styles.noticeText}>{HEALTH_NOTICE}</Text>
      </AppCard>

      <View style={styles.actions}>
        <AppButton
          disabled={currentPageIndex === 0 || isSubmitting}
          onPress={goToPreviousPage}
          title="Back"
          variant="ghost"
        />
        <AppButton
          loading={isSubmitting}
          onPress={handleContinue}
          style={styles.primaryAction}
          title={currentPage.primaryActionLabel ?? 'Save and continue'}
        />
      </View>

      {latestInsight && !currentResponse ? (
        <Text style={styles.footerText}>{latestInsight.message}</Text>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.sm,
  },
  eyebrow: {
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.hero.fontSize,
    fontWeight: theme.typography.hero.fontWeight,
    lineHeight: 42,
  },
  subtitle: {
    color: theme.colors.muted,
    lineHeight: 24,
  },
  progressHeader: {
    gap: theme.spacing.xs,
  },
  progressLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  progressCaption: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
  progressTrack: {
    height: 10,
    borderRadius: theme.radii.round,
    overflow: 'hidden',
    backgroundColor: theme.colors.secondarySurface,
  },
  progressFill: {
    height: '100%',
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primary,
  },
  formCard: {
    gap: theme.spacing.md,
  },
  responseCard: {
    backgroundColor: theme.colors.secondarySurface,
    gap: theme.spacing.xs,
  },
  errorCard: {
    backgroundColor: theme.colors.warningSurface,
    gap: theme.spacing.xs,
  },
  responseTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  responseText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  noticeCard: {
    backgroundColor: theme.colors.warningSurface,
    gap: theme.spacing.xs,
  },
  noticeTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  noticeText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  primaryAction: {
    flex: 1,
  },
  footerText: {
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});