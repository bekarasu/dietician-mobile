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
      <SectionHeader title="Verify your email" subtitle="Enter the 6-digit code sent to your email address." />

      <AppCard style={styles.form}>
        <Controller
          control={control}
          name="otp"
          rules={{ 
            required: 'OTP is required',
            minLength: { value: 6, message: 'OTP must be 6 digits' },
            maxLength: { value: 6, message: 'OTP must be 6 digits' }
          }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error: fieldError } }) => (
            <AppTextInput 
              label="OTP Code" 
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
          title="Verify"
          onPress={handleSubmit(async (values) => verifyOTP(values.otp))}
        />
      </AppCard>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Didn't receive the code?</Text>
        <AppButton title="Go back to register" variant="ghost" onPress={() => navigation.goBack()} />
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
