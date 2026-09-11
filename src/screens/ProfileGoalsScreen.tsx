import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { DIETARY_OPTIONS, GOAL_TYPE_OPTIONS } from '../constants/options';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useProfileStore } from '../store/useProfileStore';
import { theme } from '../theme/theme';
import { DietaryPreference, GoalType, UserProfile } from '../types/models';
import { AppStackParamList, AppTabParamList } from '../navigation/navigationTypes';

interface ProfileFormValues {
  name: string;
  age: string;
  heightCm: string;
  goalType: GoalType;
  dietaryPreferences: DietaryPreference[];
}

function toFormValues(profile: UserProfile): ProfileFormValues {
  return {
    name: profile.name,
    age: String(profile.age),
    heightCm: String(profile.heightCm),
    goalType: profile.goalType,
    dietaryPreferences: profile.dietaryPreferences || [],
  };
}

export function ProfileGoalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<RouteProp<AppTabParamList, 'ProfileGoals'>>();
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const logout = useAuthStore((state) => state.logout);
  const restartOnboarding = useOnboardingStore((state) => state.restartOnboarding);
  const [isLoading, setIsLoading] = useState(false);
  const [mealReminders, setMealReminders] = useState(true);
  const [safeGuidanceMode, setSafeGuidanceMode] = useState(true);

  const { control, handleSubmit, reset, watch, setValue } = useForm<ProfileFormValues>({
    defaultValues: profile
      ? toFormValues(profile)
      : {
          name: '',
          age: '',
          heightCm: '',
          goalType: 'habit_building',
          dietaryPreferences: [],
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
        <AppButton title="Save profile" loading={isLoading} onPress={handleSubmit(onSubmit)} />
      </AppCard>

      <SectionHeader title="Dietary Restrictions" subtitle="Manage your food allergies and disliked items." />
      <AppCard style={styles.form}>
        <View style={styles.foodSelectorContainer}>
          <Text style={styles.foodSelectorLabel}>Disliked foods</Text>
          <TouchableOpacity
            style={styles.foodSelectorButton}
            onPress={() =>
              navigation.navigate('FoodSelection', {
                selectedFoods: profile?.dislikedFoods || [],
                fieldName: 'dislikedFoods',
              })
            }
          >
            <Text style={profile?.dislikedFoods?.length ? styles.foodSelectorText : styles.foodSelectorPlaceholder}>
              {profile?.dislikedFoods?.length ? profile.dislikedFoods.join(', ') : 'Select foods to avoid...'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.foodSelectorContainer}>
          <Text style={styles.foodSelectorLabel}>Allergies</Text>
          <TouchableOpacity
            style={styles.foodSelectorButton}
            onPress={() =>
              navigation.navigate('FoodSelection', {
                selectedFoods: profile?.allergies || [],
                fieldName: 'allergies',
              })
            }
          >
            <Text style={profile?.allergies?.length ? styles.foodSelectorText : styles.foodSelectorPlaceholder}>
              {profile?.allergies?.length ? profile.allergies.join(', ') : 'Select allergies...'}
            </Text>
          </TouchableOpacity>
        </View>
      </AppCard>

      <SectionHeader title="Medical Data" subtitle="Manage your uploaded medical and blood test results." />
      <AppCard style={styles.form}>
        <AppButton title="Manage Blood Test Results" variant="secondary" onPress={() => navigation.navigate('BloodTestUpload')} />
      </AppCard>

      <SectionHeader title="Settings" subtitle="Manage your app preferences and account settings." />
      <AppCard style={styles.form}>
        <View style={styles.settingRow}>
          <View style={styles.settingTextBlock}>
            <Text style={styles.settingTitle}>Meal reminders</Text>
            <Text style={styles.settingText}>Keep lightweight notifications for hydration, meals, and check-ins.</Text>
          </View>
          <Switch value={mealReminders} onValueChange={setMealReminders} thumbColor={theme.colors.surface} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingTextBlock}>
            <Text style={styles.settingTitle}>Safe guidance mode</Text>
            <Text style={styles.settingText}>Bias recommendations toward sustainable nutrition and avoid compensatory restriction.</Text>
          </View>
          <Switch value={safeGuidanceMode} onValueChange={setSafeGuidanceMode} thumbColor={theme.colors.surface} trackColor={{ true: theme.colors.primary, false: theme.colors.border }} />
        </View>

        <AppButton title="Restart onboarding" variant="secondary" onPress={restartOnboarding} />
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
  foodSelectorContainer: {
    gap: theme.spacing.xs,
  },
  foodSelectorLabel: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  foodSelectorButton: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
  },
  foodSelectorText: {
    color: theme.colors.text,
    fontSize: 16,
  },
  foodSelectorPlaceholder: {
    color: theme.colors.muted,
    fontSize: 16,
  },
});