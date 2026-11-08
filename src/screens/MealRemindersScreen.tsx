import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { formatStartsIn, getPlanSchedule } from '../features/dietPlan/planSchedule';
import {
  formatReminderTime,
  MINUTES_PER_DAY,
  REMINDER_MEAL_TYPES,
  ReminderMealType,
} from '../features/reminders/mealReminderSettings';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useMealReminderStore } from '../store/useMealReminderStore';
import { theme } from '../theme/theme';
import { DietPlan } from '../types/models';

const STEP_MINUTES = 15;

const MEAL_DETAILS: Record<ReminderMealType, { icon: keyof typeof Ionicons.glyphMap; detail: string }> = {
  Breakfast: { icon: 'sunny-outline', detail: 'Every plan day' },
  Lunch: { icon: 'restaurant-outline', detail: 'Every plan day' },
  Snack: { icon: 'nutrition-outline', detail: 'On days your plan has a snack' },
  Dinner: { icon: 'moon-outline', detail: 'Every plan day' },
};

// Why no reminders are coming, or null while the plan has meals ahead.
function describeQuietPlan(plan: DietPlan | null, isPlanLoaded: boolean) {
  if (!isPlanLoaded) {
    return null;
  }
  if (!plan) {
    return 'You don\'t have a plan yet. Reminders start with your first one.';
  }
  const schedule = getPlanSchedule(plan);
  if (schedule.phase === 'upcoming' && schedule.daysUntilStart) {
    return `Your plan starts ${formatStartsIn(schedule.daysUntilStart)}, and reminders start with it.`;
  }
  if (schedule.phase === 'ended' && !plan.nextPlan) {
    return 'Your plan has ended. Reminders start again with your next plan.';
  }
  return null;
}

function TimeStepper({ label, minutes, onChange }: { label: string; minutes: number; onChange: (minutes: number) => void }) {
  const step = (delta: number) => onChange((minutes + delta + MINUTES_PER_DAY) % MINUTES_PER_DAY);
  const time = formatReminderTime(minutes);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${label} reminder time`}
      accessibilityValue={{ text: time }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? STEP_MINUTES : -STEP_MINUTES)}
      style={styles.stepper}
    >
      <Text style={styles.stepperLabel}>Remind me at</Text>
      <View style={styles.stepperControls}>
        <Pressable hitSlop={8} onPress={() => step(-STEP_MINUTES)} style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
          <Ionicons name="remove" size={18} color={theme.colors.primary} />
        </Pressable>
        <Text style={styles.time}>{time}</Text>
        <Pressable hitSlop={8} onPress={() => step(STEP_MINUTES)} style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
          <Ionicons name="add" size={18} color={theme.colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

export function MealRemindersScreen() {
  const settings = useMealReminderStore((state) => state.settings);
  const permission = useMealReminderStore((state) => state.permission);
  const updateMeal = useMealReminderStore((state) => state.updateMeal);
  const activePlan = useDietPlanStore((state) => state.activePlan);
  const isPlanLoaded = useDietPlanStore((state) => state.planLoadedAt !== null);

  const quietPlan = describeQuietPlan(activePlan, isPlanLoaded);

  return (
    <ScreenContainer>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>A nudge at each meal</Text>
        <Text style={styles.introText}>
          Each reminder names that meal from your plan, and is skipped once you've logged it. Tap one to log your meal.
        </Text>
      </View>

      {settings.enabled && permission !== 'granted' ? (
        <View style={styles.notice}>
          <View style={styles.noticeHeader}>
            <Ionicons name="notifications-off-outline" size={18} color={theme.colors.text} />
            <Text style={styles.noticeTitle}>Notifications are off</Text>
          </View>
          <Text style={styles.noticeText}>Allow notifications for Eativio in Settings, and your reminders start again.</Text>
          <AppButton title="Open Settings" variant="secondary" onPress={() => Linking.openSettings()} />
        </View>
      ) : null}

      {quietPlan ? (
        <View style={styles.notice}>
          <View style={styles.noticeHeader}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.text} />
            <Text style={styles.noticeText}>{quietPlan}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.menu}>
        {REMINDER_MEAL_TYPES.map((mealType) => {
          const meal = settings.meals[mealType];
          const { icon, detail } = MEAL_DETAILS[mealType];
          return (
            <View key={mealType} style={styles.mealRow}>
              <View style={styles.mealHeader}>
                <View style={styles.mealIcon}>
                  <Ionicons name={icon} size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.mealText}>
                  <Text style={styles.mealLabel}>{mealType}</Text>
                  <Text style={styles.mealDetail}>{detail}</Text>
                </View>
                <Switch
                  accessibilityLabel={`${mealType} reminder`}
                  value={meal.enabled}
                  onValueChange={(enabled) => updateMeal(mealType, { enabled })}
                  thumbColor={theme.colors.surface}
                  trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
                />
              </View>
              {meal.enabled ? (
                <TimeStepper label={mealType} minutes={meal.minutes} onChange={(minutes) => updateMeal(mealType, { minutes })} />
              ) : null}
            </View>
          );
        })}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: theme.spacing.xs,
  },
  introTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  introText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize + 2,
    lineHeight: theme.typography.caption.lineHeight + 4,
  },
  notice: {
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.warningSurface,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  noticeTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  noticeText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize + 1,
    lineHeight: theme.typography.caption.lineHeight + 2,
  },
  menu: {
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  mealRow: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  mealIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  mealText: {
    flex: 1,
    gap: 2,
  },
  mealLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  mealDetail: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 34 + theme.spacing.md,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.secondarySurface,
  },
  stepperLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    opacity: 0.6,
  },
  time: {
    minWidth: 76,
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
