import { create } from 'zustand';

import {
  DEFAULT_MEAL_REMINDER_SETTINGS,
  loadMealReminderSettings,
  MealReminderSettings,
  MealReminderTime,
  ReminderMealType,
  saveMealReminderSettings,
} from '../features/reminders/mealReminderSettings';
import { getReminderPermission, ReminderPermission, requestReminderPermission } from '../features/reminders/mealReminders';

interface MealReminderState {
  settings: MealReminderSettings;
  permission: ReminderPermission;
  isLoaded: boolean;
  // Never rejects: startup goes on with the defaults.
  load: () => Promise<void>;
  // The user can change it in the Settings app at any time.
  refreshPermission: () => Promise<void>;
  // Turning on asks for permission first, and stays off without it. Returns the permission.
  setEnabled: (enabled: boolean) => Promise<ReminderPermission>;
  updateMeal: (mealType: ReminderMealType, change: Partial<MealReminderTime>) => void;
  setAwayReminder: (awayReminder: boolean) => void;
}

function persist(settings: MealReminderSettings) {
  saveMealReminderSettings(settings).catch((error) => console.warn('Failed to save meal reminder settings', error));
}

// A device setting, not user data, so logout does not reset it. Logout cancels
// the scheduled reminders instead, because they name the user's meals.
export const useMealReminderStore = create<MealReminderState>((set, get) => ({
  settings: DEFAULT_MEAL_REMINDER_SETTINGS,
  permission: 'ask',
  isLoaded: false,
  load: async () => {
    const [settings, permission] = await Promise.all([
      loadMealReminderSettings().catch(() => DEFAULT_MEAL_REMINDER_SETTINGS),
      getReminderPermission().catch((): ReminderPermission => 'ask'),
    ]);
    set({ settings, permission, isLoaded: true });
  },
  refreshPermission: async () => {
    const permission = await getReminderPermission().catch(() => get().permission);
    if (permission !== get().permission) {
      set({ permission });
    }
  },
  setEnabled: async (enabled) => {
    let permission = get().permission;
    if (enabled) {
      permission = await requestReminderPermission().catch((): ReminderPermission => 'ask');
      set({ permission });
      if (permission !== 'granted') {
        return permission;
      }
    }
    const settings = { ...get().settings, enabled };
    set({ settings });
    persist(settings);
    return permission;
  },
  updateMeal: (mealType, change) => {
    const current = get().settings;
    const settings = { ...current, meals: { ...current.meals, [mealType]: { ...current.meals[mealType], ...change } } };
    set({ settings });
    persist(settings);
  },
  setAwayReminder: (awayReminder) => {
    const settings = { ...get().settings, awayReminder };
    set({ settings });
    persist(settings);
  },
}));

// Reminders go out only while both the setting and the permission allow them.
export function selectRemindersOn(state: MealReminderState) {
  return state.settings.enabled && state.permission === 'granted';
}
