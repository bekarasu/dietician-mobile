import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { HEALTH_NOTICE } from '../constants/health';
import { theme } from '../theme/theme';
import { AuthStackParamList } from '../navigation/navigationTypes';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <ScreenContainer contentStyle={styles.content} scrollable={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>AI-assisted nutrition planning</Text>
        <Text style={styles.title}>Build calmer food habits with daily structure.</Text>
        <Text style={styles.subtitle}>
          Scaffolded for adaptive meal planning, recovery guidance, hydration tracking, and progress coaching.
        </Text>
      </View>

      <AppCard>
        <Text style={styles.cardTitle}>What this boilerplate already covers</Text>
        <Text style={styles.cardText}>Auth, dashboard, food logging, inventory, recommendations, hydration, progress, blood test placeholders, and friend competition flows.</Text>
      </AppCard>

      <AppCard style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>Health boundary</Text>
        <Text style={styles.noticeText}>{HEALTH_NOTICE}</Text>
      </AppCard>

      <View style={styles.actions}>
        <AppButton title="Create account" onPress={() => navigation.navigate('Register')} />
        <AppButton title="Log in" variant="secondary" onPress={() => navigation.navigate('Login')} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: {
    gap: theme.spacing.md,
  },
  eyebrow: {
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.hero.fontSize,
    fontWeight: theme.typography.hero.fontWeight,
    lineHeight: 44,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
    lineHeight: 24,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  cardText: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
  noticeCard: {
    backgroundColor: theme.colors.warningSurface,
  },
  noticeTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  noticeText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  actions: {
    gap: theme.spacing.md,
  },
});