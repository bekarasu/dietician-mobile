import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { DIETARY_OPTIONS, GOAL_TYPE_OPTIONS } from '../constants/options';
import { useAuthStore } from '../store/useAuthStore';
import { useProfileStore } from '../store/useProfileStore';
import { theme } from '../theme/theme';
import { DietaryPreference, GoalType, UserProfile } from '../types/models';

interface ProfileFormValues {
  name: string;
  age: string;
  heightCm: string;
  goalType: GoalType;
  dietaryPreferences: DietaryPreference[];
  dislikedFoods: string;
}

function toFormValues(profile: UserProfile): ProfileFormValues {
  return {
    name: profile.name,
    age: String(profile.age),
    heightCm: String(profile.heightCm),
    goalType: profile.goalType,
    dietaryPreferences: profile.dietaryPreferences || [],
    dislikedFoods: profile.dislikedFoods.join(', '),
  };
}

export function ProfileGoalsScreen() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, reset, watch, setValue } = useForm<ProfileFormValues>({
    defaultValues: profile
      ? toFormValues(profile)
      : {
          name: '',
          age: '',
          heightCm: '',
          goalType: 'habit_building',
          dietaryPreferences: [],
          dislikedFoods: '',
        },
  });

  useEffect(() => {
    if (profile) {
      reset(toFormValues(profile));
    }
  }, [profile, reset]);

  const selectedGoalType = watch('goalType');
  const selectedDietaryPreferences = watch('dietaryPreferences');

  const onSubmit = async (values: ProfileFormValues) => {
    if (!profile) {
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile({
        ...profile,
        name: values.name.trim(),
        age: Number(values.age) || profile.age,
        heightCm: Number(values.heightCm) || profile.heightCm,
        goalType: values.goalType,
        dietaryPreferences: values.dietaryPreferences,
        dislikedFoods: values.dislikedFoods
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      });
      Alert.alert('Success', 'Profile saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile.');
    } finally {
      setIsLoading(false);
    }
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

        <View style={styles.goalGroup}>
          <Text style={styles.goalLabel}>Dietary preferences</Text>
          <View style={styles.goalOptions}>
            {DIETARY_OPTIONS.map((option) => (
              <AppButton
                key={option.value}
                title={option.label}
                variant={selectedDietaryPreferences?.includes(option.value) ? 'primary' : 'secondary'}
                onPress={() => {
                  const current = selectedDietaryPreferences || [];
                  if (current.includes(option.value)) {
                    setValue('dietaryPreferences', current.filter((v) => v !== option.value));
                  } else {
                    setValue('dietaryPreferences', [...current, option.value]);
                  }
                }}
                style={styles.goalButton}
              />
            ))}
          </View>
        </View>

        <Controller
          control={control}
          name="dislikedFoods"
          render={({ field: { onBlur, onChange, value } }) => (
            <AppTextInput label="Disliked foods" onBlur={onBlur} onChangeText={onChange} placeholder="mushrooms, liver" value={value} />
          )}
        />

        <AppButton title="Save profile" loading={isLoading} onPress={handleSubmit(onSubmit)} />
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