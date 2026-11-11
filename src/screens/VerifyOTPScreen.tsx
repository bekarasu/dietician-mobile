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

interface VerifyOTPFormValues {
  otp: string;
}

type Props = NativeStackScreenProps<AuthStackParamList, 'VerifyOTP'>;

export function VerifyOTPScreen({ navigation }: Props) {
  const verifyOTP = useAuthStore((state) => state.verifyOTP);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  const { control, handleSubmit } = useForm<VerifyOTPFormValues>({
    defaultValues: {
      otp: '',
    },
  });

  return (
    <ScreenContainer>
      <SectionHeader title={t('auth.otp.title')} subtitle={t('auth.otp.subtitle')} />

      <AppCard style={styles.form}>
        <Controller
          control={control}
          name="otp"
          rules={{ 
            required: t('auth.otp.required'),
            minLength: { value: 6, message: t('auth.otp.length') },
            maxLength: { value: 6, message: t('auth.otp.length') }
          }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error: fieldError } }) => (
            <AppTextInput 
              label={t('auth.otp.label')} 
              keyboardType="number-pad"
              onBlur={onBlur} 
              onChangeText={onChange} 
              value={value} 
              error={fieldError?.message} 
            />
          )}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AppButton
          loading={isLoading}
          title={t('auth.otp.submit')}
          onPress={handleSubmit(async (values) => verifyOTP(values.otp))}
        />
      </AppCard>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('auth.otp.noCode')}</Text>
        <AppButton title={t('auth.otp.back')} variant="ghost" onPress={() => navigation.goBack()} />
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
