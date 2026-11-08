import * as SecureStore from 'expo-secure-store';

// The meal types plans use, in the order of a day. Every plan day has a
// breakfast, lunch and dinner; snacks come on some days only.
export const REMINDER_MEAL_TYPES = ['Breakfast', 'Lunch', 'Snack', 'Dinner'] as const;

export type ReminderMealType = (typeof REMINDER_MEAL_TYPES)[number];

export interface MealReminderTime {
  enabled: boolean;
  // Minutes after local midnight.
  minutes: number;
}

// A setting of this device, not of the account: the notifications are local.
export interface MealReminderSettings {
  enabled: boolean;
  meals: Record<ReminderMealType, MealReminderTime>;
}

export const MINUTES_PER_DAY = 24 * 60;

// Off until the user turns it on, because that asks for notification permission.
export const DEFAULT_MEAL_REMINDER_SETTINGS: MealReminderSettings = {
  enabled: false,
  meals: {
    Breakfast: { enabled: true, minutes: 8 * 60 + 30 },
    Lunch: { enabled: true, minutes: 12 * 60 + 30 },
    Snack: { enabled: false, minutes: 16 * 60 },
    Dinner: { enabled: true, minutes: 19 * 60 + 30 },
  },
};

const STORAGE_KEY = 'MEAL_REMINDER_SETTINGS';

export function isReminderMealType(value: string): value is ReminderMealType {
  return (REMINDER_MEAL_TYPES as readonly string[]).includes(value);
}

function isMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < MINUTES_PER_DAY;
}

// Anything missing or malformed falls back to its default, so settings saved by
// an older version still load.
function normalize(value: unknown): MealReminderSettings {
  const saved = (value ?? {}) as Partial<MealReminderSettings>;
  const savedMeals = (saved.meals ?? {}) as Partial<Record<ReminderMealType, Partial<MealReminderTime>>>;
  const meals = { ...DEFAULT_MEAL_REMINDER_SETTINGS.meals };

  for (const mealType of REMINDER_MEAL_TYPES) {
    const meal = savedMeals[mealType];
    meals[mealType] = {
      enabled: typeof meal?.enabled === 'boolean' ? meal.enabled : meals[mealType].enabled,
      minutes: isMinutes(meal?.minutes) ? meal.minutes : meals[mealType].minutes,
    };
  }

  return {
    enabled: typeof saved.enabled === 'boolean' ? saved.enabled : DEFAULT_MEAL_REMINDER_SETTINGS.enabled,
    meals,
  };
}

export async function loadMealReminderSettings(): Promise<MealReminderSettings> {
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_MEAL_REMINDER_SETTINGS;
  }
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return DEFAULT_MEAL_REMINDER_SETTINGS;
  }
}

export async function saveMealReminderSettings(settings: MealReminderSettings) {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
}

// "8:30 AM", matching the app's other en-US times.
export function formatReminderTime(minutes: number) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60),
  );
}
