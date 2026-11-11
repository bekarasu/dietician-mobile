import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ChoiceChips } from '../components/ChoiceChips';
import { CountryPicker } from '../components/CountryPicker';
import { FoodPickerRow } from '../components/FoodPickerRow';
import { ScreenContainer } from '../components/ScreenContainer';
import { describeBuild } from '../constants/appEnv';
import { IOS_PUSH_ENABLED } from '../constants/notifications';
import { ACTIVITY_LEVEL_OPTIONS, DIETARY_OPTIONS, GENDER_OPTIONS, GOAL_TYPE_OPTIONS, SPECIAL_PROGRAM_OPTIONS } from '../constants/options';
import { showDialog } from '../features/dialog/dialogStore';
import {
  canHavePregnancyPlan,
  getPregnancyGoalError,
  getPregnancyWeekError,
  getTargetWeightError,
  toggleDietaryPreference,
} from '../features/profile/profileRules';
import { formatReminderTime, MealReminderSettings, REMINDER_MEAL_TYPES } from '../features/reminders/mealReminderSettings';
import { AppStackParamList } from '../navigation/navigationTypes';
import { getErrorMessage } from '../services/apiError';
import { friendService } from '../services/friendService';
import { useAuthStore } from '../store/useAuthStore';
import { selectRemindersOn, useMealReminderStore } from '../store/useMealReminderStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useProfileStore } from '../store/useProfileStore';
import { useProgressStore } from '../store/useProgressStore';
import { t, TranslationKey } from '../i18n';
import { theme } from '../theme/theme';
import { DietaryPreference, GoalType, UserProfile } from '../types/models';
import { formatGoalType, formatKg, formatLitres, formatMealType } from '../utils/formatters';

interface ProfileFormValues {
  name: string;
  age: string;
  heightCm: string;
  targetWeightKg: string;
  gender: string;
  activityLevel: string;
  goalType: GoalType;
  pregnant: boolean;
  pregnancyWeek: string;
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
    pregnant: Boolean(profile.pregnancyWeek),
    pregnancyWeek: profile.pregnancyWeek ? String(profile.pregnancyWeek) : '',
  };
}

// Pregnancy counts only while it can show: picking male hides it, and saving
// then ends it.
const isPregnant = (values: ProfileFormValues) => canHavePregnancyPlan(values.gender) && values.pregnant;

const positiveNumber = (messageKey: TranslationKey) => (value: string) => Number(value) > 0 || t(messageKey);

// "Breakfast 8:30 AM · Lunch 12:30 PM"
function summarizeReminders(settings: MealReminderSettings) {
  const times = REMINDER_MEAL_TYPES.filter((mealType) => settings.meals[mealType].enabled).map(
    (mealType) => `${formatMealType(mealType)} ${formatReminderTime(settings.meals[mealType].minutes)}`,
  );
  return times.length ? times.join(' · ') : t('profile.reminders.noMeals');
}

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
  const [isSavingCountry, setIsSavingCountry] = useState(false);
  const remindersOn = useMealReminderStore(selectRemindersOn);
  const reminderSettings = useMealReminderStore((state) => state.settings);
  const setRemindersEnabled = useMealReminderStore((state) => state.setEnabled);
  // Shown while the permission prompt is open, so the switch doesn't jump back.
  const [pendingReminders, setPendingReminders] = useState<boolean | null>(null);
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

  const { control, handleSubmit, reset, formState, watch } = useForm<ProfileFormValues>({
    defaultValues: profile ? toFormValues(profile) : undefined,
  });
  const showSpecialPrograms = canHavePregnancyPlan(watch('gender'));
  const showPregnancyWeek = showSpecialPrograms && watch('pregnant');

  // A refresh or a saved diet change replaces the profile, so fields being
  // edited keep what was typed.
  useEffect(() => {
    if (profile) {
      reset(toFormValues(profile), { keepDirtyValues: true });
    }
  }, [profile, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    // Sent only when it differs from the profile's week: the server stores the
    // due date it gives, so sending the same week again could move it by days.
    const pregnancyWeek = isPregnant(values) ? Number(values.pregnancyWeek) : 0;
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
        pregnancyWeek: pregnancyWeek !== (profile?.pregnancyWeek ?? 0) ? pregnancyWeek : undefined,
      });
      reset(values);
      // The server sets the water target and coffee limit from age and pregnancy, so reload to show them.
      refreshProfile().catch(() => undefined);
      showDialog({ title: t('profile.saved.title'), message: t('profile.saved.message'), icon: 'checkmark-circle-outline' });
    } catch (error) {
      showDialog({ title: t('common.errors.title'), message: getErrorMessage(error, t('profile.errors.saveProfile')), tone: 'danger' });
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
      showDialog({ title: t('common.errors.title'), message: getErrorMessage(error, t('profile.errors.saveDiet')), tone: 'danger' });
    } finally {
      setIsSavingDiet(false);
    }
  };

  // Applies to the next plan and to swaps; the current plan's meals stay.
  const saveCountry = async (countryCode: string) => {
    setIsSavingCountry(true);
    try {
      await updateDetails({ countryCode });
    } catch (error) {
      showDialog({ title: t('common.errors.title'), message: getErrorMessage(error, t('profile.errors.saveCountry')), tone: 'danger' });
    } finally {
      setIsSavingCountry(false);
    }
  };

  const toggleReminders = async (enabled: boolean) => {
    setPendingReminders(enabled);
    const permission = await setRemindersEnabled(enabled);
    setPendingReminders(null);
    if (!enabled || permission === 'granted' || permission === 'ask') {
      return;
    }
    if (permission === 'blocked') {
      showDialog({
        title: t('profile.reminders.blockedTitle'),
        message: t('profile.reminders.blockedMessage'),
        icon: 'notifications-off-outline',
        buttons: [
          { text: t('common.actions.notNow'), style: 'cancel' },
          { text: t('common.actions.openSettings'), onPress: () => Linking.openSettings() },
        ],
      });
    } else {
      showDialog({ title: t('profile.reminders.updateTitle'), message: t('profile.reminders.updateMessage') });
    }
  };

  const confirmLogout = () => {
    showDialog({
      title: t('profile.logout.title'),
      message: t('profile.logout.message'),
      icon: 'log-out-outline',
      buttons: [
        { text: t('common.actions.cancel'), style: 'cancel' },
        { text: t('common.actions.logOut'), style: 'destructive', onPress: logout },
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
          <Text style={styles.name}>{profile?.name || t('profile.header.fallbackName')}</Text>
          <View style={styles.tags}>
            {profile ? <Text style={styles.tag}>{formatGoalType(profile.goalType)}</Text> : null}
            {profile?.pregnancyWeek ? <Text style={styles.tag}>{t('profile.header.pregnancyWeek', { week: profile.pregnancyWeek })}</Text> : null}
            {activityLabel ? <Text style={styles.tag}>{activityLabel}</Text> : null}
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label={t('profile.stats.weight')} value={latestWeight ? formatKg(latestWeight) : '--'} />
        <View style={styles.statDivider} />
        <Stat label={t('profile.stats.target')} value={profile?.targetWeightKg ? formatKg(profile.targetWeightKg) : '--'} />
        <View style={styles.statDivider} />
        <Stat label={t('profile.stats.height')} value={profile?.heightCm ? `${profile.heightCm} cm` : '--'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('profile.personalDetails')}</Text>
        <Controller
          control={control}
          name="name"
          rules={{ validate: (value) => value.trim().length > 0 || t('profile.form.enterName') }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label={t('profile.form.name')} onBlur={onBlur} onChangeText={onChange} value={value} error={error?.message} />
          )}
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <Controller
              control={control}
              name="age"
              rules={{ validate: positiveNumber('profile.form.enterAge') }}
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                <AppTextInput inputMode="decimal" label={t('profile.form.age')} onBlur={onBlur} onChangeText={onChange} suffix={t('profile.form.ageUnit')} value={value} error={error?.message} />
              )}
            />
          </View>
          <View style={styles.half}>
            <Controller
              control={control}
              name="heightCm"
              rules={{ validate: positiveNumber('profile.form.enterHeight') }}
              render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
                <AppTextInput inputMode="decimal" label={t('profile.form.height')} onBlur={onBlur} onChangeText={onChange} suffix="cm" value={value} error={error?.message} />
              )}
            />
          </View>
        </View>
        <Controller
          control={control}
          name="targetWeightKg"
          rules={{
            validate: (value, values) => {
              const positive = positiveNumber('profile.form.enterTarget')(value);
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
            <AppTextInput inputMode="decimal" label={t('profile.form.targetWeight')} onBlur={onBlur} onChangeText={onChange} suffix="kg" value={value} error={error?.message} />
          )}
        />
        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.form.goal')}</Text>
          <Controller
            control={control}
            name="goalType"
            rules={{ validate: (value, values) => getPregnancyGoalError(isPregnant(values), value) ?? true }}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <>
                <ChoiceChips options={GOAL_TYPE_OPTIONS} isSelected={(option) => option === value} onPress={onChange} />
                {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
              </>
            )}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.form.sex')}</Text>
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <ChoiceChips options={GENDER_OPTIONS} isSelected={(option) => option === value} onPress={onChange} />
            )}
          />
        </View>
        {showSpecialPrograms ? (
          <View style={styles.field}>
            <View>
              <Text style={styles.label}>{t('profile.form.specialProgram')}</Text>
              <Text style={styles.cardCaption}>{t('profile.form.specialProgramHelp')}</Text>
            </View>
            <Controller
              control={control}
              name="pregnant"
              render={({ field: { onChange, value } }) => (
                <ChoiceChips options={SPECIAL_PROGRAM_OPTIONS} isSelected={() => value} onPress={() => onChange(!value)} />
              )}
            />
          </View>
        ) : null}
        {showPregnancyWeek ? (
          <Controller
            control={control}
            name="pregnancyWeek"
            rules={{ validate: (value, values) => !isPregnant(values) || (getPregnancyWeekError(value) ?? true) }}
            render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
              <AppTextInput
                inputMode="numeric"
                label={t('profile.form.pregnancyWeek')}
                onBlur={onBlur}
                onChangeText={onChange}
                suffix={t('profile.form.pregnancyWeekUnit')}
                value={value}
                error={error?.message}
              />
            )}
          />
        ) : null}
        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.form.activity')}</Text>
          <Controller
            control={control}
            name="activityLevel"
            render={({ field: { onChange, value } }) => (
              <ChoiceChips options={ACTIVITY_LEVEL_OPTIONS} isSelected={(option) => option === value} onPress={onChange} />
            )}
          />
        </View>
        <AppButton
          title={formState.isDirty ? t('profile.form.saveChanges') : t('profile.form.saved')}
          disabled={!formState.isDirty || !profile}
          loading={isSaving}
          onPress={handleSubmit(onSubmit)}
        />
      </View>

      <View style={styles.card}>
        <View>
          <Text style={styles.cardTitle}>{t('profile.food.title')}</Text>
          <Text style={styles.cardCaption}>{t('profile.food.caption')}</Text>
        </View>
        <View style={styles.field}>
          <View>
            <Text style={styles.label}>{t('profile.food.country')}</Text>
            <Text style={styles.cardCaption}>{t('profile.food.countryCaption')}</Text>
          </View>
          <CountryPicker value={profile?.countryCode ?? ''} onChange={saveCountry} disabled={isSavingCountry || !profile} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.food.diet')}</Text>
          <ChoiceChips
            options={DIETARY_OPTIONS}
            isSelected={(value) => (profile?.dietaryPreferences ?? []).includes(value as DietaryPreference)}
            onPress={toggleDiet}
            disabled={isSavingDiet || !profile}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.food.disliked')}</Text>
          <FoodPickerRow
            foods={profile?.dislikedFoods ?? []}
            placeholder={t('profile.food.dislikedPlaceholder')}
            onPress={() => navigation.navigate('FoodSelection', { selectedFoods: profile?.dislikedFoods ?? [], fieldName: 'dislikedFoods' })}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>{t('profile.food.allergies')}</Text>
          <FoodPickerRow
            foods={profile?.allergies ?? []}
            placeholder={t('profile.food.allergiesPlaceholder')}
            onPress={() => navigation.navigate('FoodSelection', { selectedFoods: profile?.allergies ?? [], fieldName: 'allergies' })}
          />
        </View>
      </View>

      <View style={styles.card}>
        <View>
          <Text style={styles.cardTitle}>{t('profile.targets.title')}</Text>
          <Text style={styles.cardCaption}>
            {profile?.pregnancyWeek ? t('profile.targets.pregnancyCaption') : t('profile.targets.caption')}
          </Text>
        </View>
        <View style={styles.targets}>
          <View style={[styles.target, { backgroundColor: theme.colors.waterSoft }]}>
            <Ionicons name="water" size={18} color={theme.colors.water} />
            <Text style={styles.targetValue}>{profile?.targetWaterMl ? formatLitres(profile.targetWaterMl) : '--'}</Text>
            <Text style={styles.targetLabel}>{t('profile.targets.waterLabel')}</Text>
          </View>
          <View style={[styles.target, { backgroundColor: theme.colors.coffeeSoft }]}>
            <Ionicons name="cafe" size={18} color={theme.colors.coffee} />
            <Text style={styles.targetValue}>{t('profile.targets.cups', { cups: profile?.targetCoffeeCups ?? '--' })}</Text>
            <Text style={styles.targetLabel}>{t('profile.targets.coffeeLabel')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.menu}>
        <MenuRow icon="trending-down-outline" label={t('profile.menu.weightHistory')} onPress={() => navigation.navigate('WeightProgress')} />
        <MenuRow
          icon="snow-outline"
          label={t('profile.menu.fridge')}
          detail={fridgeCount ? t('profile.menu.ingredients', { count: fridgeCount }) : t('profile.menu.fridgeEmpty')}
          onPress={() => navigation.navigate('Inventory')}
        />
        <MenuRow icon="document-text-outline" label={t('profile.menu.bloodTests')} onPress={() => navigation.navigate('BloodTestUpload')} />
        <MenuRow
          icon="people-outline"
          label={t('profile.menu.friends')}
          detail={incomingRequestCount ? t('profile.menu.requests', { count: incomingRequestCount }) : undefined}
          badge={incomingRequestCount}
          onPress={() => navigation.navigate('Friends')}
        />
      </View>

      <View style={styles.menu}>
        <SettingRow
          title={t('profile.menu.mealReminders')}
          text={t('profile.menu.mealRemindersText')}
          value={pendingReminders ?? remindersOn}
          onChange={toggleReminders}
        />
        {remindersOn ? (
          <MenuRow
            icon="time-outline"
            label={t('profile.menu.reminderTimes')}
            detail={summarizeReminders(reminderSettings)}
            onPress={() => navigation.navigate('MealReminders')}
          />
        ) : null}
        {IOS_PUSH_ENABLED ? (
          <MenuRow
            icon="notifications-outline"
            label={t('profile.menu.push')}
            detail={t('profile.menu.pushDetail')}
            onPress={() => navigation.navigate('PushNotifications')}
          />
        ) : null}
        <SettingRow
          title={t('profile.menu.safeGuidance')}
          text={t('profile.menu.safeGuidanceText')}
          value={safeGuidanceMode}
          onChange={setSafeGuidanceMode}
        />
      </View>

      <View style={styles.menu}>
        <MenuRow icon="refresh-outline" label={t('profile.menu.restart')} detail={t('profile.menu.restartDetail')} onPress={restartOnboarding} />
        <MenuRow icon="log-out-outline" label={t('common.actions.logOut')} danger onPress={confirmLogout} />
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
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.caption.fontSize,
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
