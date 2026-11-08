import { requireOptionalNativeModule } from 'expo';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

import { DietPlan } from '../../types/models';
import { MealReminderSettings } from './mealReminderSettings';
import { MEAL_REMINDER_KIND, planMealReminders } from './planMealReminders';

// expo-notifications throws on import in a native build made before it was
// added, so it loads only when its native side is there. Without it, reminders
// report 'unavailable' instead of crashing the app.
const Notifications: typeof NotificationsModule | null = requireOptionalNativeModule('ExpoNotificationScheduler')
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-notifications')
  : null;

const CHANNEL_ID = 'meal-reminders';

// 'ask' can still show the system prompt; 'blocked' needs the Settings app.
export type ReminderPermission = 'granted' | 'ask' | 'blocked' | 'unavailable';

// Syncs and cancels run one at a time, in order, so a cancel at logout can't be
// overtaken by a sync that started before it.
// The queue never rejects, so one failure doesn't stop the next task.
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>) {
  queue = queue.then(task).catch((error) => console.warn('Meal reminders failed', error));
  return queue;
}

function isMealReminder(request: NotificationsModule.NotificationRequest) {
  return request.content.data?.kind === MEAL_REMINDER_KIND;
}

function toPermission(status: NotificationsModule.NotificationPermissionsStatus): ReminderPermission {
  if (status.granted || status.ios?.status === Notifications?.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  return status.canAskAgain ? 'ask' : 'blocked';
}

async function ensureChannel() {
  if (!Notifications || Platform.OS !== 'android') {
    return;
  }
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Meal reminders',
    description: 'A nudge at each meal in your plan.',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function getReminderPermission(): Promise<ReminderPermission> {
  if (!Notifications) {
    return 'unavailable';
  }
  return toPermission(await Notifications.getPermissionsAsync());
}

// Shows the system prompt unless the user already answered it.
export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (!Notifications) {
    return 'unavailable';
  }
  // Android 13 shows its prompt only once the app has a channel.
  await ensureChannel();
  return toPermission(
    await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }),
  );
}

// Shows reminders that arrive while the app is open, without a sound.
export function configureReminderPresentation() {
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

// Brings the scheduled reminders in line with the plan, touching only those
// that changed: the plan reloads on every visit to Today.
export function syncMealReminders(plan: DietPlan | null, settings: MealReminderSettings) {
  return enqueue(async () => {
    if (!Notifications) {
      return;
    }
    const { upcoming, loggedIds } = planMealReminders(plan, settings, new Date());
    const wanted = new Map(upcoming.map((reminder) => [reminder.identifier, reminder]));
    const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter(isMealReminder);

    for (const request of scheduled) {
      const next = wanted.get(request.identifier);
      if (next && request.content.data?.signature === next.data.signature) {
        wanted.delete(request.identifier);
      } else {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      }
    }

    if (wanted.size > 0) {
      await ensureChannel();
    }
    for (const reminder of wanted.values()) {
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: reminder.identifier,
          content: { title: reminder.title, body: reminder.body, data: reminder.data, sound: 'default' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.fireAt, channelId: CHANNEL_ID },
        });
      } catch (error) {
        // One that fails, such as a time that passed meanwhile, doesn't stop the rest.
        console.warn('Failed to schedule a meal reminder', error);
      }
    }

    if (loggedIds.length > 0) {
      const presented = await Notifications.getPresentedNotificationsAsync();
      for (const notification of presented) {
        if (loggedIds.includes(notification.request.identifier)) {
          await Notifications.dismissNotificationAsync(notification.request.identifier);
        }
      }
    }
  });
}

// Removes every meal reminder, scheduled or already shown. They name the user's
// meals, so logout calls this.
export function cancelMealReminders() {
  return enqueue(async () => {
    if (!Notifications) {
      return;
    }
    const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter(isMealReminder);
    for (const request of scheduled) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
    const presented = await Notifications.getPresentedNotificationsAsync();
    for (const notification of presented) {
      if (isMealReminder(notification.request)) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }
  });
}

// Calls onOpen when the user taps a meal reminder, including the one that
// launched the app. Returns the unsubscribe function.
export function onMealReminderOpened(onOpen: () => void) {
  if (!Notifications) {
    return () => undefined;
  }
  const notifications = Notifications;
  const handle = (response: NotificationsModule.NotificationResponse | null) => {
    if (response && isMealReminder(response.notification.request)) {
      // Handled once, so logging in again later doesn't reopen it.
      notifications.clearLastNotificationResponse();
      onOpen();
    }
  };

  handle(notifications.getLastNotificationResponse());
  const subscription = notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
