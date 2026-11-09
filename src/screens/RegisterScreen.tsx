import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import {
  acceptedDocuments,
  hasAcceptedRequired,
  LegalChecks,
  LegalConsentList,
} from '../features/legal/LegalConsentList';
import { useAuthStore } from '../store/useAuthStore';
import { useLegalStore } from '../store/useLegalStore';
import { theme } from '../theme/theme';
import { AuthStackParamList } from '../navigation/navigationTypes';

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const otpToken = useAuthStore((state) => state.otpToken);
  const documents = useLegalStore((state) => state.documents);
  const documentsStatus = useLegalStore((state) => state.documentsStatus);
  const loadDocuments = useLegalStore((state) => state.loadDocuments);

  const [checked, setChecked] = useState<LegalChecks>({});
  const [showMissingConsent, setShowMissingConsent] = useState(false);
  const documentsReady = documentsStatus === 'ready';
  const consentMissing = !hasAcceptedRequired(documents, checked);

  // Every visit, so a version published since the last one is what gets accepted.
  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (otpToken) {
      navigation.navigate('VerifyOTP');
    }
  }, [otpToken, navigation]);

  const toggleDocument = (id: string) => {
    setChecked((current) => ({ ...current, [id]: !current[id] }));
  };

  const { control, handleSubmit } = useForm<RegisterFormValues>({
    defaultValues: {
      firstName: 'Burak',
      lastName: 'Karasu',
      email: 'public.void95@gmail.com',
      password: 'Qwe123456*',
    },
  });

  const submit = handleSubmit(async (values) => {
    if (consentMissing) {
      setShowMissingConsent(true);
      return;
    }
    await register(values.firstName, values.lastName, values.email, values.password, acceptedDocuments(documents, checked));
  });

  return (
    <ScreenContainer scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <SectionHeader title="Create your profile" subtitle="Keep registration light here. Production builds can add social auth, MFA, and consent flows." />

      <AppCard style={styles.form}>
        <Controller
          control={control}
          name="firstName"
          rules={{ required: 'First name is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error: fieldError } }) => (
            <AppTextInput label="First name" onBlur={onBlur} onChangeText={onChange} value={value} error={fieldError?.message} />
          )}
        />
        <Controller
          control={control}
          name="lastName"
          rules={{ required: 'Last name is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error: fieldError } }) => (
            <AppTextInput label="Last name" onBlur={onBlur} onChangeText={onChange} value={value} error={fieldError?.message} />
          )}
        />
        <Controller
          control={control}
          name="email"
          rules={{ required: 'Email is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error: fieldError } }) => (
            <AppTextInput
              autoCapitalize="none"
              keyboardType="email-address"
              label="Email"
              onBlur={onBlur}
              onChangeText={onChange}
              textContentType="username"
              value={value}
              error={fieldError?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{ required: 'Password is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error: fieldError } }) => (
            <AppTextInput
              label="Password"
              onBlur={onBlur}
              onChangeText={onChange}
              secureTextEntry
              textContentType="newPassword"
              value={value}
              error={fieldError?.message}
            />
          )}
        />

        {documentsStatus === 'error' ? (
          <View style={styles.consentState}>
            <Text style={styles.error}>We couldn't load the terms you need to accept.</Text>
            <AppButton title="Try again" variant="secondary" onPress={() => void loadDocuments()} />
          </View>
        ) : !documentsReady ? (
          <ActivityIndicator color={theme.colors.primary} style={styles.consentState} />
        ) : documents.length > 0 ? (
          <LegalConsentList
            checked={checked}
            documents={documents}
            onOpen={(document) => navigation.navigate('LegalDocument', { document })}
            onToggle={toggleDocument}
            showMissing={showMissingConsent}
          />
        ) : null}

        {showMissingConsent && consentMissing ? (
          <Text style={styles.error}>Please accept the required documents to continue.</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          disabled={!documentsReady}
          loading={isLoading}
          title="Create account"
          onPress={submit}
        />
      </AppCard>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <AppButton title="Go to login" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: theme.spacing.md,
  },
  error: {
    color: theme.colors.danger,
  },
  consentState: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  footer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  footerText: {
    color: theme.colors.muted,
  },
});