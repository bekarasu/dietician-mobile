import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { AppStackParamList } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store/useAuthStore';
import { useDietPlanStore } from '../../store/useDietPlanStore';
import { useMealReminderStore } from '../../store/useMealReminderStore';
import { cancelMealReminders, configureReminderPresentation, onMealReminderOpened, syncMealReminders } from './mealReminders';

// A plan older than this is reloaded when the app comes back, in case it changed
// elsewhere, such as a group owner starting a shared plan.
const PLAN_MAX_AGE_MS = 6 * 60 * 60 * 1000;

// Reads the stores when it runs, so the AppState listener never sees stale values.
function syncNow() {
  const { settings, permission, isLoaded } = useMealReminderStore.getState();
  // Logout cancels them itself, and must not be followed by a plan reload.
  if (!isLoaded || !useAuthStore.getState().isAuthenticated) {
    return;
  }
  if (!settings.enabled || permission !== 'granted') {
    void cancelMealReminders();
    return;
  }

  const { activePlan, planLoadedAt, isLoading, fetchActivePlan } = useDietPlanStore.getState();
  if (planLoadedAt === null || Date.now() - planLoadedAt > PLAN_MAX_AGE_MS) {
    // Its result comes back through planLoadedAt and syncs again.
    if (!isLoading) {
      void fetchActivePlan();
    }
    // Until the plan is known, the reminders already scheduled stay.
    if (planLoadedAt === null) {
      return;
    }
  }
  void syncMealReminders(activePlan, settings);
}

// Keeps the local meal reminders in line with the plan and the settings, and
// opens Today when one is tapped. Mounted in the tab navigator, so it runs
// only while someone is signed in with onboarding done.
export function useMealReminderSync() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const activePlan = useDietPlanStore((state) => state.activePlan);
  const planLoadedAt = useDietPlanStore((state) => state.planLoadedAt);
  const settings = useMealReminderStore((state) => state.settings);
  const permission = useMealReminderStore((state) => state.permission);
  const isLoaded = useMealReminderStore((state) => state.isLoaded);

  useEffect(() => {
    configureReminderPresentation();
  }, []);

  // A logged meal reloads the plan, which drops that meal's reminder.
  useEffect(() => {
    syncNow();
  }, [activePlan, planLoadedAt, settings, permission, isLoaded]);

  // Coming back moves the window on a day, and picks up a permission changed in Settings.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void useMealReminderStore.getState().refreshPermission().then(syncNow);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(
    () => onMealReminderOpened(() => navigation.navigate('Tabs', { screen: 'Home' })),
    [navigation],
  );
}
