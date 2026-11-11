import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { hasAcceptedRequired, LegalChecks, LegalConsentList } from '../features/legal/LegalConsentList';
import { LegalStackParamList } from '../navigation/navigationTypes';
import { getErrorMessage } from '../services/apiError';
import { useAuthStore } from '../store/useAuthStore';
import { useLegalStore } from '../store/useLegalStore';
import { t } from '../i18n';
import { theme } from '../theme/theme';

type Props = NativeStackScreenProps<LegalStackParamList, 'LegalUpdate'>;

// Shown by RootNavigator, before anything else, while the user has required
// documents to accept: a new version of one, or a new one. Accepting them all
// lets RootNavigator move on; the only other way out is signing out.
export function LegalUpdateScreen({ navigation }: Props) {
  const pending = useLegalStore((state) => state.pending);
  const acceptPending = useLegalStore((state) => state.acceptPending);
  const logout = useAuthStore((state) => state.logout);

  const [checked, setChecked] = useState<LegalChecks>({});
  const [showMissing, setShowMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const accept = async () => {
    if (!hasAcceptedRequired(pending, checked)) {
      setShowMissing(true);
      setError(t('legal.update.acceptRequired'));
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      // Pending documents are all required, so every one is sent.
      await acceptPending(pending);
    } catch (acceptError) {
      setError(getErrorMessage(acceptError, t('legal.update.saveFailed')));
    } finally {
      setIsSaving(false);
    }
  };

  const signOut = async () => {
    setIsSigningOut(true);
    await logout();
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title={t('legal.update.title')}
        subtitle={t('legal.update.subtitle')}
      />

      <AppCard style={styles.card}>
        <LegalConsentList
          checked={checked}
          documents={pending}
          onOpen={(document) => navigation.navigate('LegalDocument', { document })}
          onToggle={(id) => setChecked((current) => ({ ...current, [id]: !current[id] }))}
          showMissing={showMissing}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton disabled={isSigningOut} loading={isSaving} onPress={accept} title={t('legal.update.accept')} />
      </AppCard>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('legal.update.decline')}</Text>
        <AppButton disabled={isSaving} loading={isSigningOut} onPress={signOut} title={t('common.actions.signOut')} variant="ghost" />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.lg,
  },
  error: {
    color: theme.colors.danger,
  },
  footer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  footerText: {
    color: theme.colors.muted,
  },
});
