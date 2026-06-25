import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { GOAL_TYPE_OPTIONS } from '../constants/options';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileStore } from '../store/useProfileStore';
import { theme } from '../theme/theme';
import { GoalType, UserProfile } from '../types/models';

interface ProfileFormValues {
  name: string;
  age: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  goalType: GoalType;
  dietaryPreferences: string;
  dislikedFoods: string;
  dailyCalorieTarget: string;
}

function toFormValues(profile: UserProfile): ProfileFormValues {
  return {
    name: profile.name,
    age: String(profile.age),
    heightCm: String(profile.heightCm),
    weightKg: String(profile.weightKg),
    targetWeightKg: String(profile.targetWeightKg),
    goalType: profile.goalType,
    dietaryPreferences: profile.dietaryPreferences.join(', '),
    dislikedFoods: profile.dislikedFoods.join(', '),
    dailyCalorieTarget: String(profile.dailyCalorieTarget),
  };
}

export function ProfileGoalsScreen() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);

  const { control, handleSubmit, reset, watch, setValue } = useForm<ProfileFormValues>({
    defaultValues: profile
      ? toFormValues(profile)
      : {
          name: '',
          age: '',
          heightCm: '',
          weightKg: '',
          targetWeightKg: '',
          goalType: 'habit_building',
          dietaryPreferences: '',
          dislikedFoods: '',
          dailyCalorieTarget: '',
        },
  });

  useEffect(() => {
    if (profile) {
      reset(toFormValues(profile));
    }
  }, [profile, reset]);

  const selectedGoalType = watch('goalType');

  const onSubmit = async (values: ProfileFormValues) => {
    if (!profile) {
      return;
    }

    await updateProfile({
      ...profile,
      name: values.name.trim(),
      age: Number(values.age) || profile.age,
      heightCm: Number(values.heightCm) || profile.heightCm,
      weightKg: Number(values.weightKg) || profile.weightKg,
      targetWeightKg: Number(values.targetWeightKg) || profile.targetWeightKg,
      goalType: values.goalType,
      dietaryPreferences: values.dietaryPreferences
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean) as UserProfile['dietaryPreferences'],
      dislikedFoods: values.dislikedFoods
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      dailyCalorieTarget: Number(values.dailyCalorieTarget) || profile.dailyCalorieTarget,
    });
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title="Profile and goals"
        subtitle="This form intentionally keeps health guidance generalized. Production versions should layer on consents, validation rules, and secure persistence for sensitive data."
      />

      <AppCard style={styles.form}>
        <Controller
          control={control}
          name="name"
          rules={{ required: 'Name is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label="Name" onBlur={onBlur} onChangeText={onChange} value={value} error={error?.message} />
          )}
        />

        <View style={styles.row}>
          <Controller
            control={control}
            name="age"
            rules={{ required: 'Age is required' }}
            render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
              <AppTextInput
                keyboardType="numeric"
                label="Age"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="heightCm"
            rules={{ required: 'Height is required' }}
            render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
              <AppTextInput
                keyboardType="numeric"
                label="Height (cm)"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={error?.message}
              />
            )}
          />
        </View>

        <View style={styles.row}>
          <Controller
            control={control}
            name="weightKg"
            rules={{ required: 'Weight is required' }}
            render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
              <AppTextInput
                keyboardType="numeric"
                label="Weight (kg)"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="targetWeightKg"
            rules={{ required: 'Target weight is required' }}
            render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
              <AppTextInput
                keyboardType="numeric"
                label="Target weight (kg)"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                error={error?.message}
              />
            )}
          />
        </View>

        <View style={styles.goalGroup}>
          <Text style={styles.goalLabel}>Goal type</Text>
          <View style={styles.goalOptions}>
            {GOAL_TYPE_OPTIONS.map((option) => (
              <AppButton
                key={option.value}
                title={option.label}
                variant={selectedGoalType === option.value ? 'primary' : 'secondary'}
                onPress={() => setValue('goalType', option.value)}
                style={styles.goalButton}
              />
            ))}
          </View>
        </View>

        <Controller
          control={control}
          name="dietaryPreferences"
          render={({ field: { onBlur, onChange, value } }) => (
            <AppTextInput
              label="Dietary preferences"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="omnivore, gluten_free"
              value={value}
            />
          )}
        />
        <Controller
          control={control}
          name="dislikedFoods"
          render={({ field: { onBlur, onChange, value } }) => (
            <AppTextInput label="Disliked foods" onBlur={onBlur} onChangeText={onChange} placeholder="mushrooms, liver" value={value} />
          )}
        />
        <Controller
          control={control}
          name="dailyCalorieTarget"
          rules={{ required: 'Calorie target is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput
              keyboardType="numeric"
              label="Daily calorie target"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
              error={error?.message}
            />
          )}
        />

        <AppButton title="Save profile" onPress={handleSubmit(onSubmit)} />
        <AppButton title="Log out" variant="secondary" onPress={logout} />
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  goalGroup: {
    gap: theme.spacing.sm,
  },
  goalLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  goalOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  goalButton: {
    minWidth: '48%',
  },
});