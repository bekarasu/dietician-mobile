import { useCallback, useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Animated, BackHandler, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import {
  GENERATION_DETAIL,
  isGenerationCancelled,
  runPlanGeneration,
  waitForGeneration,
} from '../features/dietPlan/planGeneration';
import { useCancelGeneration } from '../features/dietPlan/useCancelGeneration';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useProfileStore } from '../store/useProfileStore';
import { recommendationService } from '../services/recommendationService';
import { theme } from '../theme/theme';
import { OnboardingStackParamList } from '../navigation/navigationTypes';

type Tip = {
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const HEALTHY_TIPS: Tip[] = [
  { text: 'Hydration is key! Drinking enough water boosts your metabolism.', icon: 'water-outline' },
  { text: 'Focusing on lean proteins helps build and repair muscle.', icon: 'fish-outline' },
  { text: 'Eating a variety of colors provides a wide range of nutrients.', icon: 'nutrition-outline' },
  { text: 'Consistency is more important than perfection in your diet.', icon: 'restaurant-outline' },
];

// RootNavigator also shows this outside the onboarding stack, with no route.
type Props = Partial<NativeStackScreenProps<OnboardingStackParamList, 'GeneratingDietPlan'>>;

export function GeneratingDietPlanScreen({ navigation, route }: Props) {
  // Onboarding passes a start date for a new plan. Without a route, this was
  // opened at launch to wait for the plan an earlier session left generating.
  const startDate = route?.params.startDate;
  const resumedGenerationId = useDietPlanStore((state) => state.resumedGeneration?.id);
  const resumedGenerationKind = useDietPlanStore((state) => state.resumedGeneration?.kind);
  const clearResumedGeneration = useDietPlanStore((state) => state.clearResumedGeneration);
  const profile = useProfileStore((state) => state.profile);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  const revertAnswers = useOnboardingStore((state) => state.revertAnswers);
  
  const [tipIndex, setTipIndex] = useState(0);
  // Each try again starts the plan afresh.
  const [attempt, setAttempt] = useState(0);
  const [hasFailed, setHasFailed] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);
  const { confirmCancel, isCancelling } = useCancelGeneration(isGenerating);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Cycle through tips every 3 seconds with a fade animation
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTipIndex((prev) => (prev + 1) % HEALTHY_TIPS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  // Leaves without a plan, keeping nothing of the onboarding it was for. Only
  // onboarding creates plans, so at launch a create was for one too, and someone
  // with no answers before it goes through onboarding again.
  const leave = useCallback(async () => {
    const revert = () => revertAnswers().catch((e) => console.error('Failed to revert onboarding answers', e));
    if (resumedGenerationId) {
      if (resumedGenerationKind === 'create') {
        await revert();
      }
      // Even if reverting swapped this screen for onboarding, or the
      // generation would open it again once onboarding ends.
      clearResumedGeneration();
    } else {
      // Back to choosing a start date.
      await revert();
      if (navigation?.isFocused()) {
        navigation.goBack();
      }
    }
  }, [navigation, resumedGenerationId, resumedGenerationKind, revertAnswers, clearResumedGeneration]);

  const leaveAfterFailure = useCallback(() => {
    setIsLeaving(true);
    void leave();
  }, [leave]);

  const tryAgain = () => {
    setHasFailed(false);
    setIsGenerating(true);
    setAttempt((current) => current + 1);
  };

  useEffect(() => {
    let isMounted = true;

    const generatePlan = async () => {
      if (!resumedGenerationId && !profile?.id) {
        if (isMounted) completeOnboarding();
        return;
      }

      try {
        if (resumedGenerationId) {
          await waitForGeneration(resumedGenerationId);
        } else if (profile?.id && startDate) {
          await runPlanGeneration(() => recommendationService.createDietPlan(profile.id, startDate, 7));
        }
        if (isMounted) setIsGenerating(false);
        await new Promise((resolve) => setTimeout(resolve, 1 * 1000));
      } catch (error) {
        if (!isMounted) return;
        if (isGenerationCancelled(error)) {
          await leave();
          return;
        }
        // It stays here, with the answers saved, until tried again or left.
        console.error('Failed to create diet plan:', error);
        setIsGenerating(false);
        setHasFailed(true);
        return;
      }

      // Add a slight delay to ensure the user sees the loading state for a moment
      setTimeout(() => {
        if (isMounted) {
          // At launch onboarding is already complete, so this only opens the plan tab.
          completeOnboarding();
          clearResumedGeneration();
        }
      }, 3000);
    };

    generatePlan();

    return () => {
      isMounted = false;
    };
  }, [attempt, profile?.id, startDate, resumedGenerationId, completeOnboarding, clearResumedGeneration, leave]);

  // Back would leave the plan generating unseen, so it offers to stop it instead.
  // Once it has failed, back leaves as the screen's own button does.
  // The iOS swipe back is off for this screen in OnboardingNavigator.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isGenerating && !isCancelling) {
        confirmCancel();
      } else if (hasFailed && !isLeaving) {
        leaveAfterFailure();
      }
      return true;
    });
    return () => subscription.remove();
  }, [isGenerating, isCancelling, confirmCancel, hasFailed, isLeaving, leaveAfterFailure]);

  if (hasFailed) {
    return (
      <ScreenContainer scrollable={false} contentStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="alert-circle-outline" size={64} color={theme.colors.danger} />
            </View>
          </View>

          <Text style={styles.title}>We couldn't prepare your plan</Text>
          {resumedGenerationId ? (
            <>
              <Text style={styles.failureText}>
                {resumedGenerationKind === 'create'
                  ? 'Nothing from the onboarding it was for is kept, so you can go through it again.'
                  : 'Your current plan stays as it is.'}
              </Text>
              <AppButton title="Continue" loading={isLeaving} onPress={leaveAfterFailure} style={styles.actionButton} />
            </>
          ) : (
            <>
              <Text style={styles.failureText}>
                Your answers are kept while you're here. Try again, or go back and nothing from this onboarding is saved.
              </Text>
              <AppButton title="Try again" disabled={isLeaving} onPress={tryAgain} style={styles.actionButton} />
              <AppButton title="Go back" variant="ghost" loading={isLeaving} onPress={leaveAfterFailure} style={styles.actionButton} />
            </>
          )}
        </View>
      </ScreenContainer>
    );
  }

  const currentTip = HEALTHY_TIPS[tipIndex];

  return (
    <ScreenContainer scrollable={false} contentStyle={styles.container}>
      <View style={styles.content}>
        
        {/* Modern Central Icon Area */}
        <Animated.View style={[styles.iconContainer, { opacity: fadeAnim }]}>
          <View style={styles.iconCircle}>
            <Ionicons name={currentTip.icon} size={64} color={theme.colors.primary} />
          </View>
        </Animated.View>
        
        <Text style={styles.title}>Generating your plan...</Text>
        <Text style={styles.subtitle}>{GENERATION_DETAIL}</Text>
        
        <ActivityIndicator size="small" color={theme.colors.primary} style={styles.spinner} />
        
        <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center' }}>
          <Text style={styles.tipText}>{currentTip.text}</Text>
        </Animated.View>

        {/* Pagination Dots */}
        <View style={styles.paginationContainer}>
          {HEALTHY_TIPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === tipIndex && styles.activeDot,
              ]}
            />
          ))}
        </View>

        {/* AI Warning Message */}
        <View style={styles.aiWarningContainer}>
          <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
          <Text style={styles.aiWarningText}>
            Our AI is carefully crafting your plan! It's always learning, so please take a moment to review the plan before applying it.
          </Text>
        </View>

        {isGenerating ? (
          <AppButton
            title="Cancel"
            variant="ghost"
            loading={isCancelling}
            onPress={confirmCancel}
            style={styles.cancelButton}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    width: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.secondarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  spinner: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '800',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  tipText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 24,
    textAlign: 'center',
    minHeight: 60, // Prevent UI jumping
  },
  failureText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.sm,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    gap: theme.spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
  },
  activeDot: {
    width: 24,
    backgroundColor: theme.colors.primary,
  },
  aiWarningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.secondarySurface,
    padding: theme.spacing.md,
    borderRadius: 12,
    marginTop: 40,
  },
  cancelButton: {
    alignSelf: 'stretch',
    marginTop: theme.spacing.md,
  },
  aiWarningText: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 12,
  },
});
