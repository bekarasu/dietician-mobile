import { DietMeal, DietPlan } from '../../types/models';
import { addCalendarDays, toCalendarDate } from '../../utils/date';
import { getPlanDayDate } from '../dietPlan/planSchedule';
import { isReminderMealType, MealReminderSettings, ReminderMealType } from './mealReminderSettings';

// How far ahead reminders are scheduled. The app schedules the next days again
// whenever it opens, and iOS keeps at most 64 pending notifications per app.
export const REMINDER_DAYS_AHEAD = 7;

export const MEAL_REMINDER_KIND = 'meal-reminder';

export interface MealReminderData {
  kind: typeof MEAL_REMINDER_KIND;
  date: string;
  mealType: ReminderMealType;
  // Changes whenever the time or text does, so a sync only replaces what changed.
  signature: string;
  [key: string]: unknown;
}

export interface PlannedMealReminder {
  identifier: string;
  fireAt: Date;
  title: string;
  body: string;
  data: MealReminderData;
}

export interface MealReminderPlan {
  upcoming: PlannedMealReminder[];
  // Today's reminders whose meals are all logged, to clear from the notification list.
  loggedIds: string[];
}

const TITLES: Record<ReminderMealType, string> = {
  Breakfast: 'Time for breakfast',
  Lunch: 'Time for lunch',
  Snack: 'Snack time',
  Dinner: 'Time for dinner',
};

export function mealReminderId(date: string, mealType: ReminderMealType) {
  return `${MEAL_REMINDER_KIND}.${date}.${mealType}`;
}

function buildBody(meals: DietMeal[]) {
  const names = meals.map((meal) => meal.name.trim()).filter(Boolean);
  if (names.length === 0) {
    return 'Your plan has a meal ready for now. Tap to log it once you\'ve eaten.';
  }
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `On your plan: ${list}. Tap to log ${names.length === 1 ? 'it' : 'them'} once you've eaten.`;
}

function toFireAt(date: string, minutes: number) {
  const [year, month, day] = date.split('-').map(Number);
  // Local time, so a reminder stays at its hour across daylight saving changes.
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
}

// One reminder per meal type and day, naming that day's meals of the type. It's
// left out once they're all logged. The next plan counts too, so reminders carry
// on into a renewal that starts within the window.
export function planMealReminders(plan: DietPlan | null, settings: MealReminderSettings, now: Date): MealReminderPlan {
  if (!plan || !settings.enabled) {
    return { upcoming: [], loggedIds: [] };
  }

  const today = toCalendarDate(now);
  const lastDay = addCalendarDays(today, REMINDER_DAYS_AHEAD - 1);
  const groups = new Map<string, { source: DietPlan; date: string; mealType: ReminderMealType; meals: DietMeal[] }>();

  for (const source of [plan, plan.nextPlan]) {
    for (const meal of source?.meals ?? []) {
      if (!source || meal.isExtra || !isReminderMealType(meal.mealType)) {
        continue;
      }
      const date = getPlanDayDate(source, meal.dayOfWeek);
      if (date < today || date > lastDay) {
        continue;
      }
      const key = mealReminderId(date, meal.mealType);
      const group = groups.get(key);
      if (!group) {
        groups.set(key, { source, date, mealType: meal.mealType, meals: [meal] });
      } else if (group.source === source) {
        // Plans don't overlap, but if they ever did, the current one wins.
        group.meals.push(meal);
      }
    }
  }

  const upcoming: PlannedMealReminder[] = [];
  const loggedIds: string[] = [];

  for (const [identifier, group] of groups) {
    const time = settings.meals[group.mealType];
    const remaining = group.meals.filter((meal) => !meal.isTaken);
    if (remaining.length === 0) {
      if (group.date === today) {
        loggedIds.push(identifier);
      }
      continue;
    }
    if (!time.enabled) {
      continue;
    }
    const fireAt = toFireAt(group.date, time.minutes);
    if (fireAt.getTime() <= now.getTime()) {
      continue;
    }
    const title = TITLES[group.mealType];
    const body = buildBody(remaining);
    upcoming.push({
      identifier,
      fireAt,
      title,
      body,
      data: {
        kind: MEAL_REMINDER_KIND,
        date: group.date,
        mealType: group.mealType,
        signature: `${fireAt.getTime()}|${title}|${body}`,
      },
    });
  }

  upcoming.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  return { upcoming, loggedIds };
}
