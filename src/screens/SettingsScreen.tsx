import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { theme } from '../theme/theme';

export function SettingsScreen() {
  const logout = useAuthStore((state) => state.logout);
  const restartOnboarding = useOnboardingStore((state) => state.restartOnboarding);
  const [mealReminders, setMealReminders] = useState(true);
  const [safeGuidanceMode, setSafeGuidanceMode] = useState(true);

  return (
    <ScreenContainer>
      <SectionHeader
        title="Settings"
        subtitle="These are local placeholders for account and preference management. Future versions can bind them to a backend profile and consent store."
      />

      <AppCard style={styles.settingRow}>
        <View style={styles.settingTextBlock}>
          <Text style={styles.settingTitle}>Meal reminders</Text>
          <Text style={styles.settingText}>Keep lightweight notifications for hydration, meals, and check-ins.</Text>
        </View>
        <Switch value={mealReminders} onValueChange={setMealReminders} thumbColor={theme.colors.surface} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} />
      </AppCard>

      <AppCard style={styles.settingRow}>
        <View style={styles.settingTextBlock}>
          <Text style={styles.settingTitle}>Safe guidance mode</Text>
          <Text style={styles.settingText}>Bias recommendations toward sustainable nutrition and avoid compensatory restriction.</Text>
        </View>
        <Switch value={safeGuidanceMode} onValueChange={setSafeGuidanceMode} thumbColor={theme.colors.surface} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} />
      </AppCard>

      <AppButton title="Restart onboarding" variant="secondary" onPress={restartOnboarding} />
      <AppButton title="Log out" variant="secondary" onPress={logout} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  settingTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  settingText: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
});