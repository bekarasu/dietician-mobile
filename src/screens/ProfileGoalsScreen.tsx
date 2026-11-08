import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ChoiceChips } from '../components/ChoiceChips';
import { FoodPickerRow } from '../components/FoodPickerRow';
import { ScreenContainer } from '../components/ScreenContainer';
import { describeBuild } from '../constants/appEnv';
import { ACTIVITY_LEVEL_OPTIONS, DIETARY_OPTIONS, GENDER_OPTIONS, GOAL_TYPE_OPTIONS } from '../constants/options';
import { showDialog } from '../features/dialog/dialogStore';
import { getTargetWeightError, toggleDietaryPreference } from '../features/profile/profileRules';
import { AppStackParamList } from '../navigation/navigationTypes';
import { friendService } from '../services/friendService';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useProfileStore } from '../store/useProfileStore';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { DietaryPreference, GoalType, UserProfile } from '../types/models';
import { formatGoalType, formatKg, formatLitres } from '../utils/formatters';

interface ProfileFormValues {
  name: string;
  age: string;
  heightCm: string;
  targetWeightKg: string;
  gender: string;
  activityLevel: string;
  goalType: GoalType;
}

function toFormValues(profile: UserProfile): ProfileFormValues {
  return {
    name: profile.name ?? '',
    age: profile.age ? String(profile.age) : '',
    heightCm: profile.heightCm ? String(profile.heightCm) : '',
    targetWeightKg: profile.targetWeightKg ? String(profile.targetWeightKg) : '',
    gender: profile.gender ?? '',
    activityLevel: profile.activityLevel ?? '',
    goalType: profile.goalType,
  };
}

const positiveNumber = (label: string) => (value: string) => Number(value) > 0 || `Enter your ${label}.`;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  badge?: number;
  danger?: boolean;
  onPress: () => void;
}

function MenuRow({ icon, label, detail, badge, danger = false, onPress }: MenuRowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}>
      <View style={[styles.menuIcon, danger && styles.menuIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? theme.colors.danger : theme.colors.primary} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
        {detail ? <Text style={styles.menuDetail}>{detail}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      {danger ? null : <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />}
    </Pressable>
  );
}

function SettingRow({ title, text, value, onChange }: { title: string; text: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.menuText}>
        <Text style={styles.menuLabel}>{title}</Text>
        <Text style={styles.menuDetail}>{text}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        thumbColor={theme.colors.surface}
        trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
      />
    </View>
  );
}

export function ProfileGoalsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const profile = useProfileStore((state) => state.profile);
  const refreshProfile = useProfileStore((state) => state.refresh);
  const updateDetails = useProfileStore((state) => state.updateDetails);
  const updatePreferences = useProfileStore((state) => state.updatePreferences);
  const entries = useProgressStore((state) => state.entries);
  const logout = useAuthStore((state) => state.logout);
  const restartOnboarding = useOnboardingStore((state) => state.restartOnboarding);

  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDiet, setIsSavingDiet] = useState(false);
  const [mealReminders, setMealReminders] = useState(true);
  const [safeGuidanceMode, setSafeGuidanceMode] = useState(true);
  const [incomingRequestCount, setIncomingRequestCount] = useState(0);

  // Runs on focus: the friends screen changes the request count, and weigh-ins
  // change the profile's weight and targets on the server. A failed refresh
  // keeps what's shown, and the friends screen reports its own errors.
  useFocusEffect(
    useCallback(() => {
      refreshProfile().catch(() => undefined);
      friendService
        .listRequests()
        .then(({ incoming }) => setIncomingRequestCount(incoming.length))
        .catch(() => setIncomingRequestCount(0));
    }, [refreshProfile]),
  );

  const { control, handleSubmit, reset, formState } = useForm<ProfileFormValues>({
    defaultValues: profile ? toFormValues(profile) : undefined,
  });

  // A refresh or a saved diet change replaces the profile, so fields being
  // edited keep what was typed.
  useEffect(() => {
    if (profile) {
      reset(toFormValues(profile), { keepDirtyValues: true });
    }
  }, [profile, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    setIsSaving(true);
    try {
      await updateDetails({
        name: values.name.trim(),
        age: Number(values.age),
        heightCm: Number(values.heightCm),
        targetWeightKg: Number(values.targetWeightKg),
        // Left out when never set, because the server only takes the listed values.
        gender: values.gender || undefined,
        activityLevel: values.activityLevel || undefined,
        goalType: values.goalType,
      });
      reset(values);
      // The server sets the coffee limit from age, so reload to show it.
      refreshProfile().catch(() => undefined);
      showDialog({ title: 'Saved', message: 'Your profile is up to date.', icon: 'checkmark-circle-outline' });
    } catch (error) {
      showDialog({ title: 'Error', message: 'We couldn\'t save your profile. Please try again.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDiet = async (value: string) => {
    const next = toggleDietaryPreference(profile?.dietaryPreferences ?? [], value as DietaryPreference);
    setIsSavingDiet(true);
    try {
      await updatePreferences({ dietaryPreferences: next });
    } catch (error) {
      showDialog({ title: 'Error', message: 'We couldn\'t save your diet. Please try again.', tone: 'danger' });
    } finally {
      setIsSavingDiet(false);
    }
  };

  const confirmLogout = () => {
    showDialog({
      title: 'Log out',
      message: 'Are you sure you want to log out?',
      icon: 'log-out-outline',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: logout },
      ],
    });
  };

  const latestWeight = entries[entries.length - 1]?.weightKg ?? profile?.weightKg;
  const activityLabel = ACTIVITY_LEVEL_OPTIONS.find((option) => option.value === profile?.activityLevel)?.label;
  const fridgeCount = profile?.availableIngredients?.length ?? 0;

  return (
    <ScreenContainer scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(profile?.name || '?').trim().charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{profile?.name || 'Your profile'}</Text>
          <View style={styles.tags}>
            {profile ? <Text style={styles.tag}>{formatGoalType(profile.goalType)}</Text> : null}
            {activityLabel ? <Text style={styles.tag}>{activityLabel}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="Weight" value={latestWeight ? formatKg(latestWeight) : '--'} />
        <View style={styles.statDivider} />
        <Stat label="Target" value={profile?.targetWeightKg ? formatKg(profile.targetWeightKg) : '--'} />
        <View style={styles.statDivider} />
        <Stat label="Height" value={profile?.heightCm ? `${profile.heightCm} cm` : '--'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal details</Text>
        <Controller
          control={control}
          name="name"
          rules={{ validate: (value) => value.trim().length > 0 || 'Enter your name.' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label="Name" onBlur={onBlur} onChangeText={onChange} value={value} error={error?.message} />
          )}
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Controller
              control={control}
              name="age"
              rules={{ validate: positiveNumber('age') }}
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                <AppTextInput inputMode="decimal" label="Age" onBlur={onBlur} onChangeText={onChange} suffix="years" value={value} error={error?.message} />
              )}
            />
          </View>
          <View style={styles.half}>
            <Controller
              control={control}
              name="heightCm"
              rules={{ validate: positiveNumber('height') }}
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                <AppTextInput inputMode="decimal" label="Height" onBlur={onBlur} onChangeText={onChange} suffix="cm" value={value} error={error?.message} />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="targetWeightKg"
          rules={{
            validate: (value, values) => {
              const positive = positiveNumber('target weight')(value);
              if (positive !== true) {
                return positive;
              }
              // The saved goal and target stay allowed, so a target since reached doesn't block other edits.
              if (values.goalType === profile?.goalType && Number(value) === profile?.targetWeightKg) {
                return true;
              }
              return getTargetWeightError(values.goalType, latestWeight ?? 0, Number(value), Number(values.heightCm)) ?? true;
            },
          }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput inputMode="decimal" label="Target weight" onBlur={onBlur} onChangeText={onChange} suffix="kg" value={value} error={error?.message} />
          )}
        />
        <View style={styles.field}>
          <Text style={styles.label}>Goal</Text>
          <Controller
            control={control}
            name="goalType"
            render={({ field: { onChange, value } }) => (
              <ChoiceChips options={GOAL_TYPE_OPTIONS} isSelected={(option) => option === value} onPress={onChange} />
            )}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Sex</Text>
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <ChoiceChips options={GENDER_OPTIONS} isSelected={(option) => option === value} onPress={onChange} />
            )}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Activity</Text>
          <Controller
            control={control}
            name="activityLevel"
            render={({ field: { onChange, value } }) => (
              <ChoiceChips options={ACTIVITY_LEVEL_OPTIONS} isSelected={(option) => option === value} onPress={onChange} />
            )}
          />
        </View>
        <AppButton
          title={formState.isDirty ? 'Save changes' : 'Saved'}
          disabled={!formState.isDirty || !profile}
          loading={isSaving}
          onPress={handleSubmit(onSubmit)}
        />
      </View>

      <View style={styles.card}>
        <View>
          <Text style={styles.cardTitle}>Food preferences</Text>
          <Text style={styles.cardCaption}>Every meal in your plan respects these. Changes save straight away.</Text>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Diet</Text>
          <ChoiceChips
            options={DIETARY_OPTIONS}
            isSelected={(value) => (profile?.dietaryPreferences ?? []).includes(value as DietaryPreference)}
            onPress={toggleDiet}
            disabled={isSavingDiet || !profile}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Foods you don't like</Text>
          <FoodPickerRow
            foods={profile?.dislikedFoods ?? []}
            placeholder="Choose foods to leave out"
            onPress={() => navigation.navigate('FoodSelection', { selectedFoods: profile?.dislikedFoods ?? [], fieldName: 'dislikedFoods' })}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Allergies</Text>
          <FoodPickerRow
            foods={profile?.allergies ?? []}
            placeholder="Choose any allergies"
            onPress={() => navigation.navigate('FoodSelection', { selectedFoods: profile?.allergies ?? [], fieldName: 'allergies' })}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View>
          <Text style={styles.cardTitle}>Daily targets</Text>
          <Text style={styles.cardCaption}>Set for you from your weight and age.</Text>
        </View>
        <View style={styles.targets}>
          <View style={[styles.target, { backgroundColor: theme.colors.waterSoft }]}>
            <Ionicons name="water" size={18} color={theme.colors.water} />
            <Text style={styles.targetValue}>{profile?.targetWaterMl ? formatLitres(profile.targetWaterMl) : '--'}</Text>
            <Text style={styles.targetLabel}>water a day</Text>
          </View>
          <View style={[styles.target, { backgroundColor: theme.colors.coffeeSoft }]}>
            <Ionicons name="cafe" size={18} color={theme.colors.coffee} />
            <Text style={styles.targetValue}>{profile?.targetCoffeeCups ?? '--'} cups</Text>
            <Text style={styles.targetLabel}>coffee at most</Text>
          </View>
        </View>
      </View>

      <View style={styles.menu}>
        <MenuRow icon="trending-down-outline" label="Weight history" onPress={() => navigation.navigate('WeightProgress')} />
        <MenuRow
          icon="snow-outline"
          label="My fridge"
          detail={fridgeCount ? `${fridgeCount} ${fridgeCount === 1 ? 'ingredient' : 'ingredients'}` : 'Plans prefer what you have'}
          onPress={() => navigation.navigate('Inventory')}
        />
        <MenuRow icon="document-text-outline" label="Blood tests" onPress={() => navigation.navigate('BloodTestUpload')} />
        <MenuRow
          icon="people-outline"
          label="Friends"
          detail={incomingRequestCount ? `${incomingRequestCount} ${incomingRequestCount === 1 ? 'request' : 'requests'} waiting` : undefined}
          badge={incomingRequestCount}
          onPress={() => navigation.navigate('Friends')}
        />
      </View>

      <View style={styles.menu}>
        <SettingRow title="Meal reminders" text="Light nudges for meals, water and check-ins." value={mealReminders} onChange={setMealReminders} />
        <SettingRow
          title="Safe guidance mode"
          text="Keeps suggestions sustainable and never compensatory."
          value={safeGuidanceMode}
          onChange={setSafeGuidanceMode}
        />
      </View>

      <View style={styles.menu}>
        <MenuRow icon="refresh-outline" label="Restart onboarding" detail="Answer the setup questions again" onPress={restartOnboarding} />
        <MenuRow icon="log-out-outline" label="Log out" danger onPress={confirmLogout} />
      </View>

      <Text selectable style={styles.buildInfo}>
        {describeBuild()}
      </Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  buildInfo: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  avatarText: {
    color: theme.colors.surface,
    fontSize: 26,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  name: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tag: {
    overflow: 'hidden',
    color: theme.colors.primary,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primarySoft,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.border,
  },
  card: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardCaption: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  half: {
    flex: 1,
  },
  field: {
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  targets: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  target: {
    flex: 1,
    gap: 4,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
  },
  targetValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  targetLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  menu: {
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  pressed: {
    backgroundColor: theme.colors.secondarySurface,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  menuIconDanger: {
    backgroundColor: theme.colors.dangerSoft,
  },
  menuText: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  menuLabelDanger: {
    color: theme.colors.danger,
  },
  menuDetail: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.danger,
  },
  badgeText: {
    color: theme.colors.surface,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '800',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
});
