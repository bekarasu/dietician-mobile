import { Activity, ProgressEntry } from '../../types/models';
import { formatKg, formatKgChange, formatLitres } from '../../utils/formatters';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// How far the user has come from their first weigh-in towards their target, in
// either direction. Null without a reading or a target to measure against.
export function getGoalProgress(entries: ProgressEntry[], targetWeightKg?: number) {
  const first = entries[0];
  const latest = entries[entries.length - 1];
  if (!first || !latest || !targetWeightKg) {
    return null;
  }

  const totalKg = Math.abs(first.weightKg - targetWeightKg);
  if (totalKg < 0.1) {
    return null;
  }
  const direction = Math.sign(first.weightKg - targetWeightKg);
  const doneKg = Math.min(Math.max((first.weightKg - latest.weightKg) * direction, 0), totalKg);

  return { doneKg: Number(doneKg.toFixed(1)), totalKg: Number(totalKg.toFixed(1)) };
}

// The change from the first weigh-in of the last 7 days to the latest. Null
// unless there are two readings in that time. Entries must be oldest first.
export function getWeeklyChange(entries: ProgressEntry[], now = new Date()) {
  const since = now.getTime() - WEEK_MS;
  const recent = entries.filter((entry) => new Date(entry.date).getTime() >= since);
  if (recent.length < 2) {
    return null;
  }
  return recent[recent.length - 1].weightKg - recent[0].weightKg;
}

function pluralCups(cups: number) {
  return `${cups} ${cups === 1 ? 'cup' : 'cups'}`;
}

export function getActivityTitle(activity: Activity) {
  switch (activity.type) {
    case 'MEAL':
      return activity.mealType ?? 'Meal';
    case 'WEIGHT':
      return 'Weigh-in';
    case 'WATER':
      return 'Water';
    case 'COFFEE':
      return 'Coffee';
  }
}

export function getActivityDetail(activity: Activity) {
  switch (activity.type) {
    case 'MEAL':
      return activity.name ?? null;
    case 'WEIGHT': {
      const weight = formatKg(activity.weightKg ?? 0);
      return activity.changeKg === undefined ? weight : `${weight} (${formatKgChange(activity.changeKg)})`;
    }
    case 'WATER': {
      const water = formatLitres(activity.waterMl ?? 0);
      return activity.waterTargetMl ? `${water} of ${formatLitres(activity.waterTargetMl)}` : water;
    }
    case 'COFFEE': {
      const cups = pluralCups(activity.coffeeCups ?? 0);
      return activity.coffeeLimitCups === undefined ? cups : `${cups}, limit ${activity.coffeeLimitCups}`;
    }
  }
}

// Keyed by the reason values progress-service returns for an activity.
const ACTIVITY_REASONS: Record<string, string> = {
  not_core_meal: 'Only breakfast, lunch and dinner earn points.',
  meal_already_counted: 'This meal already counted today.',
  plan_not_started: 'Logged before your plan started.',
  plan_replaced: 'Reset when you changed your plan.',
  no_water_logged: 'Coffee points need water logged the same day.',
};

export function getActivityReason(activity: Activity) {
  if (!activity.reason) {
    return null;
  }
  if (activity.reason === 'over_coffee_limit') {
    return `Over your limit of ${pluralCups(activity.coffeeLimitCups ?? 0)}.`;
  }
  return ACTIVITY_REASONS[activity.reason] ?? null;
}
