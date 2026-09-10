import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '../components/ScreenContainer';
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
  { text: 'Focusing on lean proteins helps build and repair muscle.', icon: 'barbell-outline' },
  { text: 'Eating a variety of colors provides a wide range of nutrients.', icon: 'color-palette-outline' },
  { text: 'Consistency is more important than perfection in your diet.', icon: 'calendar-outline' },
];

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GeneratingDietPlan'>;

export function GeneratingDietPlanScreen(_: Props) {
  const profile = useProfileStore((state) => state.profile);
  const completeOnboarding = useOnboardingStore((state) => state.completeOnboarding);
  
  const [tipIndex, setTipIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
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

  useEffect(() => {
    let isMounted = true;

    const generatePlan = async () => {
      if (!profile?.id) {
        if (isMounted) completeOnboarding();
        return;
      }

      try {
        await recommendationService.createDietPlan(profile.id);
        await new Promise((resolve) => setTimeout(resolve, 10 * 1000));
      } catch (error) {
        console.error('Failed to create diet plan:', error);
        if (isMounted) setErrorMsg('We encountered an issue, but you can still explore the app.');
      } finally {
        // Add a slight delay to ensure the user sees the loading state for a moment
        setTimeout(() => {
          if (isMounted) {
            completeOnboarding();
          }
        }, 3000);
      }
    };

    generatePlan();

    return () => {
      isMounted = false;
    };
  }, [profile?.id, completeOnboarding]);

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
        
        <ActivityIndicator size="small" color={theme.colors.primary} style={styles.spinner} />
        
        {errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center' }}>
            <Text style={styles.tipText}>{currentTip.text}</Text>
          </Animated.View>
        )}

        {/* Pagination Dots */}
        {!errorMsg && (
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
        )}

        {/* AI Warning Message */}
        <View style={styles.aiWarningContainer}>
          <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
          <Text style={styles.aiWarningText}>
            Our AI is carefully crafting your plan! It's always learning, so please take a moment to review the plan before applying it.
          </Text>
        </View>
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
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: theme.spacing.md,
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
  aiWarningText: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginLeft: 12,
  },
});
