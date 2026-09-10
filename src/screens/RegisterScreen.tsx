import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useAuthStore } from '../store/useAuthStore';
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

  useEffect(() => {
    if (otpToken) {
      navigation.navigate('VerifyOTP');
    }
  }, [otpToken, navigation]);

  const { control, handleSubmit } = useForm<RegisterFormValues>({
    defaultValues: {
      firstName: 'Burak',
      lastName: 'Karasu',
      email: 'public.void95@gmail.com',
      password: 'Qwe123456*',
    },
  });

  return (
    <ScreenContainer>
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
              value={value}
              error={fieldError?.message}
            />
          )}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          loading={isLoading}
          title="Create account"
          onPress={handleSubmit(async (values) => register(values.firstName, values.lastName, values.email, values.password))}
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
  footer: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  footerText: {
    color: theme.colors.muted,
  },
});