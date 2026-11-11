import { t, TranslationKey } from '../../i18n';
import { DietMeal, DietPlan } from '../../types/models';
import { addCalendarDays, toCalendarDate } from '../../utils/date';
import { getPlanDayDate } from '../dietPlan/planSchedule';
import { isReminderMealType, MealReminderSettings, ReminderMealType } from './mealReminderSettings';

// How far ahead reminders are scheduled. The app schedules the next days again
// whenever it opens, and iOS keeps at most 64 pending notifications per app.
export const REMINDER_DAYS_AHEAD = 7;

export const MEAL_REMINDER_KIND = 'meal-reminder';
export const AWAY_REMINDER_KIND = 'away-reminder';

export type ReminderKind = typeof MEAL_REMINDER_KIND | typeof AWAY_REMINDER_KIND;

// Days without opening the app before the away reminder. It comes a day before
// the meal reminders run out, and opening the app schedules the next ones.
export const AWAY_REMINDER_DAYS = 6;

// The away reminder is never sent at night: a time outside these hours moves
// on to the next 10:00, so it never comes early.
const AWAY_EARLIEST_MINUTES = 10 * 60;
const AWAY_LATEST_MINUTES = 20 * 60;

export interface ReminderData {
  kind: ReminderKind;
  // Changes whenever the time or text does, so a sync only replaces what changed.
  signature: string;
  [key: string]: unknown;
}

export interface MealReminderData extends ReminderData {
  kind: typeof MEAL_REMINDER_KIND;
  date: string;
  mealType: ReminderMealType;
}

export interface PlannedReminder<Data extends ReminderData = ReminderData> {
  identifier: string;
  fireAt: Date;
  title: string;
  body: string;
  data: Data;
}

export type PlannedMealReminder = PlannedReminder<MealReminderData>;

export interface MealReminderPlan {
  upcoming: PlannedMealReminder[];
  // Today's reminders whose meals are all logged, to clear from the notification list.
  loggedIds: string[];
}

// The texts go into the signature, so reminders scheduled in another language
// are replaced on the next sync.
const TITLES: Record<ReminderMealType, TranslationKey> = {
  Breakfast: 'reminders.titles.Breakfast',
  Lunch: 'reminders.titles.Lunch',
  Snack: 'reminders.titles.Snack',
  Dinner: 'reminders.titles.Dinner',
};

export function mealReminderId(date: string, mealType: ReminderMealType) {
  return `${MEAL_REMINDER_KIND}.${date}.${mealType}`;
}

function buildBody(meals: DietMeal[]) {
  const names = meals.map((meal) => meal.name.trim()).filter(Boolean);
  if (names.length === 0) {
    return t('reminders.bodyEmpty');
  }
  const list = names.length === 1 ? names[0] : t('common.list.and', { items: names.slice(0, -1).join(', '), last: names[names.length - 1] });
  return t('reminders.body', { count: names.length, list });
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
    const title = t(TITLES[group.mealType]);
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

// AWAY_REMINDER_DAYS after the app was last opened, at the same time of day
// unless that falls at night. Each opening moves it on, so it only arrives
// after that many days away.
export function planAwayReminder(settings: MealReminderSettings, lastOpenedAt: Date): PlannedReminder | null {
  if (!settings.enabled || !settings.awayReminder) {
    return null;
  }

  const fireAt = new Date(lastOpenedAt);
  // Calendar days, so a daylight saving change doesn't shift the hour.
  fireAt.setDate(fireAt.getDate() + AWAY_REMINDER_DAYS);
  fireAt.setSeconds(0, 0);
  const minutes = fireAt.getHours() * 60 + fireAt.getMinutes();
  if (minutes >= AWAY_LATEST_MINUTES) {
    fireAt.setDate(fireAt.getDate() + 1);
  }
  if (minutes < AWAY_EARLIEST_MINUTES || minutes >= AWAY_LATEST_MINUTES) {
    fireAt.setHours(Math.floor(AWAY_EARLIEST_MINUTES / 60), AWAY_EARLIEST_MINUTES % 60);
  }

  // Works whatever state the plan is in by then, since it isn't re-planned while the app is closed.
  const title = t('reminders.awayTitle');
  const body = t('reminders.awayBody');
  return {
    identifier: AWAY_REMINDER_KIND,
    fireAt,
    title,
    body,
    data: { kind: AWAY_REMINDER_KIND, signature: `${fireAt.getTime()}|${title}|${body}` },
  };
}
