import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { getHealthNotice } from '../constants/health';
import { t } from '../i18n';
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
          <Text style={styles.heroTitle}>{t('auth.welcome.heroTitle')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('auth.welcome.heroSubtitle')}
          </Text>
        </View>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✨</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>{t('auth.welcome.plansTitle')}</Text>
              <Text style={styles.featureDescription}>{t('auth.welcome.plansBody')}</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>{t('auth.welcome.trackingTitle')}</Text>
              <Text style={styles.featureDescription}>{t('auth.welcome.trackingBody')}</Text>
            </View>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🧠</Text>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>{t('auth.welcome.guidanceTitle')}</Text>
              <Text style={styles.featureDescription}>{t('auth.welcome.guidanceBody')}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.actions}>
          <AppButton title={t('auth.welcome.getStarted')} onPress={() => navigation.navigate('Register')} />
          <AppButton title={t('auth.welcome.haveAccount')} variant="secondary" onPress={() => navigation.navigate('Login')} />
        </View>
        
        <Text style={styles.healthNotice}>
          {getHealthNotice()}
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