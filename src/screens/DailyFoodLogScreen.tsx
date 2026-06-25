import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useDailyLogStore } from '../store/useDailyLogStore';
import { theme } from '../theme/theme';
import { DailyFoodLogInput } from '../types/models';
import { formatDateLabel } from '../utils/date';

export function DailyFoodLogScreen() {
  const logs = useDailyLogStore((state) => state.logs);
  const addLog = useDailyLogStore((state) => state.addLog);

  const { control, handleSubmit, reset } = useForm<DailyFoodLogInput>({
    defaultValues: {
      foodName: '',
      estimatedAmount: '',
      estimatedCalories: 0,
      notes: '',
    },
  });

  const onSubmit = (values: DailyFoodLogInput) => {
    addLog(values);
    reset({ foodName: '', estimatedAmount: '', estimatedCalories: 0, notes: '' });
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title="Daily over-consumption log"
        subtitle="Capture the food, approximate portion, and notes. The recovery copy stays intentionally conservative and avoids crash-diet advice."
      />

      <AppCard style={styles.formCard}>
        <Controller
          control={control}
          name="foodName"
          rules={{ required: 'Food name is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label="Food name" onBlur={onBlur} onChangeText={onChange} value={value} error={error?.message} />
          )}
        />
        <Controller
          control={control}
          name="estimatedAmount"
          rules={{ required: 'Estimated amount is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label="Estimated amount" onBlur={onBlur} onChangeText={onChange} value={value} error={error?.message} />
          )}
        />
        <Controller
          control={control}
          name="estimatedCalories"
          rules={{ required: 'Estimated calories are required', min: { value: 1, message: 'Calories must be above zero' } }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput
              keyboardType="numeric"
              label="Estimated calories"
              onBlur={onBlur}
              onChangeText={(text) => onChange(Number(text) || 0)}
              value={value ? String(value) : ''}
              error={error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <AppTextInput label="Notes" multiline onBlur={onBlur} onChangeText={onChange} placeholder="Context, cravings, event, energy level..." value={value} />
          )}
        />

        <AppButton title="Save log" onPress={handleSubmit(onSubmit)} />
      </AppCard>

      {logs.map((log) => (
        <AppCard key={log.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>{log.foodName}</Text>
            <Text style={styles.logDate}>{formatDateLabel(log.createdAt)}</Text>
          </View>
          <Text style={styles.logMeta}>
            {log.estimatedAmount} · {log.estimatedCalories} kcal
          </Text>
          {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
          <View style={styles.recoveryBox}>
            <Text style={styles.recoveryLabel}>Recovery recommendation</Text>
            <Text style={styles.recoveryText}>{log.recoveryRecommendation}</Text>
          </View>
        </AppCard>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  formCard: {
    gap: theme.spacing.md,
  },
  logCard: {
    gap: theme.spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  logTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    flex: 1,
  },
  logDate: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  logMeta: {
    color: theme.colors.muted,
  },
  logNotes: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  recoveryBox: {
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  recoveryLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  recoveryText: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
});