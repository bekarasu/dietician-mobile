import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { HEALTH_NOTICE } from '../constants/health';
import { theme } from '../theme/theme';
import { AuthStackParamList } from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <ScreenContainer contentStyle={styles.content} scrollable={false}>
      <View style={styles.topSection}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>🌿 NutriAI</Text>
          </View>
          <Text style={styles.heroTitle}>Your Personal{'\n'}AI Dietician</Text>
          <Text style={styles.heroSubtitle}>
            Achieve your health goals with adaptive meal planning, smart macro tracking, and personalized guidance.
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✨</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>AI-Powered Plans</Text>
              <Text style={styles.featureDescription}>Meals tailored to your unique biology and goals.</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Smart Tracking</Text>
              <Text style={styles.featureDescription}>Log your food effortlessly with AI recognition.</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🧠</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Expert Guidance</Text>
              <Text style={styles.featureDescription}>24/7 coaching to keep you on the right path.</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.actions}>
          <AppButton title="Get Started" onPress={() => navigation.navigate('Register')} />
          <AppButton title="I already have an account" variant="secondary" onPress={() => navigation.navigate('Login')} />
        </View>
        
        <Text style={styles.healthNotice}>
          {HEALTH_NOTICE}
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.xl * 1.5,
  },
  brandContainer: {
    gap: theme.spacing.sm,
  },
  logoBadge: {
    marginBottom: theme.spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.secondarySurface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.round,
  },
  logoText: {
    color: theme.colors.primary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.hero.fontSize,
    fontWeight: theme.typography.hero.fontWeight,
    lineHeight: 42,
  },
  heroSubtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 24,
    marginTop: theme.spacing.xs,
  },
  featuresContainer: {
    gap: theme.spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 18,
  },
  bottomSection: {
    gap: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  actions: {
    gap: theme.spacing.md,
  },
  healthNotice: {
    color: theme.colors.muted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.8,
  },
});