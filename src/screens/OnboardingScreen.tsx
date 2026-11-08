import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { HEALTH_NOTICE } from '../constants/health';
import { showDialog } from '../features/dialog/dialogStore';
import { OnboardingPageRenderer } from '../features/onboarding/OnboardingPageRenderer';
import { ONBOARDING_PAGES } from '../features/onboarding/onboardingPages';
import { isFieldMissing, isPregnantDraft } from '../features/onboarding/validation';
import { getTrimester, MIN_HEALTHY_BMI } from '../features/profile/profileRules';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useProfileStore } from '../store/useProfileStore';
import { theme } from '../theme/theme';
import { OnboardingDraft } from '../types/models';
import { formatKg } from '../utils/formatters';

import type { OnboardingStackParamList } from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Onboarding'>;

// The same safe pace scores expect: 0.5% of body weight a week, 0.25-0.75 kg.
const SAFE_WEEKLY_LOSS_RATE = 0.005;
const MIN_WEEKLY_LOSS_KG = 0.25;
const MAX_WEEKLY_LOSS_KG = 0.75;

// Shows what the numbers on the goal step add up to, so an unrealistic or
// unhealthy target is noticed before the plan is built around it. A weight-loss
// target that can't be used is the page's error instead, which hides this.
function GoalPreview({ draft }: { draft: OnboardingDraft }) {
  // During pregnancy weight goes up as it should, so there's no pace to show.
  // The page's error covers a goal that isn't allowed.
  if (isPregnantDraft(draft)) {
    const trimester = ['first', 'second', 'third'][getTrimester(Number(draft.pregnancyWeek)) - 1];
    return (
      <View style={styles.preview}>
        <Ionicons name="heart-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.previewText}>
          Your plan follows your pregnancy, with the energy you need in your {trimester} trimester. It never cuts calories, whatever the
          target. Keep following your doctor's or midwife's advice.
        </Text>
      </View>
    );
  }

  const weight = Number(draft.weightKg);
  const target = Number(draft.targetWeightKg);
  const height = Number(draft.heightCm);
  if (!(weight > 0) || !(target > 0)) {
    return null;
  }

  const targetBmi = height > 0 ? target / (height / 100) ** 2 : null;
  if (targetBmi !== null && targetBmi < MIN_HEALTHY_BMI) {
    return (
      <View style={[styles.preview, styles.previewWarning]}>
        <Ionicons name="alert-circle-outline" size={20} color={theme.colors.coffee} />
        <Text style={styles.previewText}>
          A target of {formatKg(target)} is below the healthy weight range for your height. You might choose a higher one.
        </Text>
      </View>
    );
  }

  if (draft.goalType === 'weight_loss') {
    const weekly = Math.min(Math.max(weight * SAFE_WEEKLY_LOSS_RATE, MIN_WEEKLY_LOSS_KG), MAX_WEEKLY_LOSS_KG);
    const weeks = Math.ceil((weight - target) / weekly);
    return (
      <View style={styles.preview}>
        <View style={styles.previewBadge}>
          <Text style={styles.previewNumber}>{weeks}</Text>
          <Text style={styles.previewUnit}>{weeks === 1 ? 'week' : 'weeks'}</Text>
        </View>
        <Text style={styles.previewText}>
          Losing {formatKg(weight - target)} at a steady {weekly.toFixed(1)} kg a week takes about {weeks} {weeks === 1 ? 'week' : 'weeks'}. Slow
          and steady is what lasts.
        </Text>
      </View>
    );
  }

  if (draft.goalType === 'maintenance') {
    return (
      <View style={styles.preview}>
        <Ionicons name="swap-horizontal-outline" size={20} color={theme.colors.primary} />
        <Text style={styles.previewText}>Your plan will keep you around {formatKg(weight)}.</Text>
      </View>
    );
  }
  return null;
}

export function OnboardingScreen({ navigation }: Props) {
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
  const isRestarting = useOnboardingStore((state) => state.isRestarting);
  const leaveOnboarding = useOnboardingStore((state) => state.leaveOnboarding);
  const addBloodTestUpload = useOnboardingStore((state) => state.addBloodTestUpload);

  const profile = useProfileStore((state) => state.profile);

  const [showValidation, setShowValidation] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const currentPage = ONBOARDING_PAGES[currentPageIndex];
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === ONBOARDING_PAGES.length - 1;
  const pageError = currentPage.validate?.(draft) ?? null;

  useEffect(() => {
    const hasStarted =
      draft.age.length > 0 ||
      draft.weightKg.length > 0 ||
      draft.targetWeightKg.length > 0 ||
      Object.keys(responses).length > 0;

    if (hasStarted) {
      return;
    }

    mergeDraft({
      name: user?.name ?? profile?.name ?? '',
      age: profile?.age ? String(profile.age) : '',
      heightCm: profile?.heightCm ? String(profile.heightCm) : '',
      weightKg: profile?.weightKg ? String(profile.weightKg) : '',
      targetWeightKg: profile?.targetWeightKg ? String(profile.targetWeightKg) : '',
      gender: profile?.gender ?? '',
      activityLevel: profile?.activityLevel ?? '',
      goalType: profile?.goalType ?? 'habit_building',
      // Restarting onboarding saves these lists again, so they start from what's
      // saved instead of empty, which used to wipe them.
      dietaryPreferences: profile?.dietaryPreferences ?? [],
      // Onboarding saves the pregnancy plan again too, and ends it if it's left out.
      specialPrograms: profile?.pregnancyWeek ? ['pregnancy'] : [],
      pregnancyWeek: profile?.pregnancyWeek ? String(profile.pregnancyWeek) : '',
      dislikedFoods: profile?.dislikedFoods?.join(', ') ?? '',
      allergies: profile?.allergies?.join(', ') ?? '',
      dailyCalorieTarget: profile?.dailyCalorieTarget ? String(profile.dailyCalorieTarget) : '',
    });
  }, [draft.age.length, draft.name.length, draft.targetWeightKg.length, draft.weightKg.length, mergeDraft, profile, responses, user?.name]);

  const handleBack = () => {
    setShowValidation(false);
    goToPreviousPage();
  };

  const handleLeave = useCallback(() => {
    showDialog({
      title: 'Leave setup?',
      message: "Nothing you entered here is saved, including a blood test you added. Your profile and plan stay as they are.",
      icon: 'exit-outline',
      buttons: [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => leaveOnboarding() },
      ],
    });
  }, [leaveOnboarding]);

  // The pages are one screen, so Android's back button would otherwise close the
  // app. It goes back a page, or offers to leave from the first one.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isSubmitting || isUploadingFile) {
          return true;
        }
        if (!isFirstPage) {
          setShowValidation(false);
          goToPreviousPage();
          return true;
        }
        if (isRestarting) {
          handleLeave();
          return true;
        }
        return false;
      });
      return () => subscription.remove();
    }, [goToPreviousPage, handleLeave, isFirstPage, isRestarting, isSubmitting, isUploadingFile]),
  );

  const handleContinue = async () => {
    setShowValidation(true);

    if (pageError || currentPage.fields.some((field) => isFieldMissing(field, draft))) {
      return;
    }

    const response = await submitPage(currentPage.id);

    if (!response) {
      return;
    }

    if (isLastPage) {
      // The answers are saved once the user creates the plan.
      navigation.navigate('PlanStartDate');
      return;
    }

    setShowValidation(false);
    goToNextPage();
  };

  return (
    <ScreenContainer scrollable={false} contentStyle={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          disabled={isFirstPage || isSubmitting || isUploadingFile}
          hitSlop={theme.spacing.sm}
          onPress={handleBack}
          style={[styles.iconButton, isFirstPage && styles.hidden]}
        >
          <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
        </Pressable>
        <View style={styles.segments}>
          {ONBOARDING_PAGES.map((page, index) => (
            <View key={page.id} style={[styles.segment, index <= currentPageIndex && styles.segmentDone]} />
          ))}
        </View>
        <Text style={styles.stepCount}>
          {currentPageIndex + 1}/{ONBOARDING_PAGES.length}
        </Text>
        {isRestarting ? (
          <Pressable
            accessibilityLabel="Leave setup"
            accessibilityRole="button"
            disabled={isSubmitting || isUploadingFile}
            hitSlop={theme.spacing.sm}
            onPress={handleLeave}
            style={styles.iconButton}
          >
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </Pressable>
        ) : null}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepHeader}>
            <View style={styles.stepIcon}>
              <Ionicons name={currentPage.icon} size={26} color={theme.colors.primary} />
            </View>
            <Text style={styles.title}>{currentPage.title}</Text>
            <Text style={styles.subtitle}>{currentPage.subtitle}</Text>
          </View>

          <OnboardingPageRenderer
            draft={draft}
            onChange={updateField}
            page={currentPage}
            showValidation={showValidation}
            onUploadingChange={setIsUploadingFile}
            onBloodTestUploaded={addBloodTestUpload}
          />

          {pageError ? (
            <View style={[styles.preview, styles.previewWarning]}>
              <Ionicons name="alert-circle-outline" size={20} color={showValidation ? theme.colors.danger : theme.colors.coffee} />
              <Text style={styles.previewText}>{pageError}</Text>
            </View>
          ) : currentPage.id === 'goals' ? (
            <GoalPreview draft={draft} />
          ) : null}

          {currentPage.hint ? (
            <View style={styles.hint}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.hintText}>{currentPage.hint}</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Ionicons name="cloud-offline-outline" size={20} color={theme.colors.danger} />
              <View style={styles.errorTextBlock}>
                <Text style={styles.errorTitle}>We couldn't save your answers</Text>
                <Text style={styles.errorText}>Check your connection and try again.</Text>
              </View>
            </View>
          ) : null}

          <Text style={styles.notice}>{HEALTH_NOTICE}</Text>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            disabled={isUploadingFile}
            loading={isSubmitting}
            onPress={handleContinue}
            title={currentPage.primaryActionLabel ?? 'Continue'}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  hidden: {
    opacity: 0,
  },
  segments: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.secondarySurface,
  },
  segmentDone: {
    backgroundColor: theme.colors.primary,
  },
  stepCount: {
    color: theme.colors.muted,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'right',
  },
  body: {
    flex: 1,
    gap: theme.spacing.md,
  },
  scrollContent: {
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  stepHeader: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  stepIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
    marginBottom: theme.spacing.xs,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 22,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.primarySoft,
  },
  previewWarning: {
    backgroundColor: theme.colors.coffeeSoft,
  },
  previewBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  previewNumber: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  previewUnit: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  previewText: {
    flex: 1,
    color: theme.colors.text,
    lineHeight: 21,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  hintText: {
    flex: 1,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: '#FDECEC',
  },
  errorTextBlock: {
    flex: 1,
    gap: 2,
  },
  errorTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  errorText: {
    color: theme.colors.muted,
  },
  notice: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    textAlign: 'center',
  },
  footer: {
    paddingTop: theme.spacing.sm,
  },
});
