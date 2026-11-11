import { Controller, useForm } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useAuthStore } from '../store/useAuthStore';
import { t } from '../i18n';
import { theme } from '../theme/theme';
import { AuthStackParamList } from '../navigation/navigationTypes';

interface LoginFormValues {
  email: string;
  password: string;
}

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  const { control, handleSubmit } = useForm<LoginFormValues>();

  return (
    <ScreenContainer>
      <SectionHeader title={t('auth.login.title')} subtitle={t('auth.login.subtitle')} />

      <AppCard style={styles.form}>
        <Controller
          control={control}
          name="email"
          rules={{ required: t('auth.fields.emailRequired') }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error: fieldError } }) => (
            <AppTextInput
              autoCapitalize="none"
              keyboardType="email-address"
              label={t('auth.fields.email')}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={fieldError?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{ required: t('auth.fields.passwordRequired') }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error: fieldError } }) => (
            <AppTextInput
              label={t('auth.fields.password')}
              onBlur={onBlur}
              onChangeText={onChange}
              secureTextEntry
              value={value}
              error={fieldError?.message}
            />
          )}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton loading={isLoading} title={t('auth.login.submit')} onPress={handleSubmit(async (values) => login(values.email, values.password))} />
      </AppCard>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.login.needAccount')}</Text>
        <AppButton title={t('auth.login.createOne')} variant="ghost" onPress={() => navigation.navigate('Register')} />
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
  footer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  footerText: {
    color: theme.colors.muted,
  },
});