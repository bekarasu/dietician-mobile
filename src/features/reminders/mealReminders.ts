import { requireOptionalNativeModule } from 'expo';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

import { t, TranslationKey } from '../../i18n';
import { DietPlan } from '../../types/models';
import { MealReminderSettings } from './mealReminderSettings';
import {
  AWAY_REMINDER_KIND,
  MEAL_REMINDER_KIND,
  planAwayReminder,
  planMealReminders,
  PlannedReminder,
  ReminderKind,
} from './planMealReminders';

// expo-notifications throws on import in a native build made before it was
// added, so it loads only when its native side is there. Without it, reminders
// report 'unavailable' instead of crashing the app.
const Notifications: typeof NotificationsModule | null = requireOptionalNativeModule('ExpoNotificationScheduler')
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('expo-notifications')
  : null;

// Separate Android channels, so either kind can be muted in the system settings.
// Their names are set again in the current language each time they're created.
const CHANNELS: Record<ReminderKind, { id: string; nameKey: TranslationKey; descriptionKey: TranslationKey }> = {
  [MEAL_REMINDER_KIND]: { id: 'meal-reminders', nameKey: 'reminders.channels.mealName', descriptionKey: 'reminders.channels.mealDescription' },
  [AWAY_REMINDER_KIND]: { id: 'away-reminders', nameKey: 'reminders.channels.awayName', descriptionKey: 'reminders.channels.awayDescription' },
};

// 'ask' can still show the system prompt; 'blocked' needs the Settings app.
export type ReminderPermission = 'granted' | 'ask' | 'blocked' | 'unavailable';

// Syncs and cancels run one at a time, in order, so a cancel at logout can't be
// overtaken by a sync that started before it. The queue never rejects, so one
// failure doesn't stop the next task.
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>) {
  queue = queue.then(task).catch((error) => console.warn('Reminders failed', error));
  return queue;
}

function kindOf(request: NotificationsModule.NotificationRequest) {
  return request.content.data?.kind as ReminderKind | undefined;
}

function isAppReminder(request: NotificationsModule.NotificationRequest) {
  const kind = kindOf(request);
  return kind === MEAL_REMINDER_KIND || kind === AWAY_REMINDER_KIND;
}

function toPermission(status: NotificationsModule.NotificationPermissionsStatus): ReminderPermission {
  if (status.granted || status.ios?.status === Notifications?.IosAuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }
  return status.canAskAgain ? 'ask' : 'blocked';
}

async function ensureChannels() {
  if (!Notifications || Platform.OS !== 'android') {
    return;
  }
  for (const channel of Object.values(CHANNELS)) {
    await Notifications.setNotificationChannelAsync(channel.id, {
      name: t(channel.nameKey),
      description: t(channel.descriptionKey),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

async function schedule(notifications: typeof NotificationsModule, reminder: PlannedReminder) {
  try {
    await notifications.scheduleNotificationAsync({
      identifier: reminder.identifier,
      content: { title: reminder.title, body: reminder.body, data: reminder.data, sound: 'default' },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
        channelId: CHANNELS[reminder.data.kind].id,
      },
    });
  } catch (error) {
    // One that fails, such as a time that passed meanwhile, doesn't stop the rest.
    console.warn('Failed to schedule a reminder', error);
  }
}

async function dismissPresented(notifications: typeof NotificationsModule, shouldDismiss: (request: NotificationsModule.NotificationRequest) => boolean) {
  const presented = await notifications.getPresentedNotificationsAsync();
  for (const notification of presented) {
    if (shouldDismiss(notification.request)) {
      await notifications.dismissNotificationAsync(notification.request.identifier);
    }
  }
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
  await ensureChannels();
  return toPermission(
    await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }),
  );
}

// Local reminders stay quiet. Remote pushes also present in the foreground;
// iOS displays the original notification, so no duplicate is scheduled in JS.
export function configureReminderPresentation() {
  Notifications?.setNotificationHandler({
    handleNotification: async (notification) => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: !isAppReminder(notification.request),
      shouldSetBadge: false,
    }),
  });
}

// Brings the scheduled meal reminders in line with the plan, touching only
// those that changed: the plan reloads on every visit to Today.
export function syncMealReminders(plan: DietPlan | null, settings: MealReminderSettings) {
  return enqueue(async () => {
    if (!Notifications) {
      return;
    }
    const { upcoming, loggedIds } = planMealReminders(plan, settings, new Date());
    const wanted = new Map(upcoming.map((reminder) => [reminder.identifier, reminder]));
    const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter(
      (request) => kindOf(request) === MEAL_REMINDER_KIND,
    );

    for (const request of scheduled) {
      const next = wanted.get(request.identifier);
      if (next && request.content.data?.signature === next.data.signature) {
        wanted.delete(request.identifier);
      } else {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      }
    }

    if (wanted.size > 0) {
      await ensureChannels();
    }
    for (const reminder of wanted.values()) {
      await schedule(Notifications, reminder);
    }

    if (loggedIds.length > 0) {
      await dismissPresented(Notifications, (request) => loggedIds.includes(request.identifier));
    }
  });
}

// Moves the away reminder to AWAY_REMINDER_DAYS after lastOpenedAt, or removes
// it when it's turned off. One already shown goes too: the user is back.
export function syncAwayReminder(settings: MealReminderSettings, lastOpenedAt: Date) {
  return enqueue(async () => {
    if (!Notifications) {
      return;
    }
    await dismissPresented(Notifications, (request) => kindOf(request) === AWAY_REMINDER_KIND);

    const planned = planAwayReminder(settings, lastOpenedAt);
    const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter(
      (request) => kindOf(request) === AWAY_REMINDER_KIND,
    );
    let isScheduled = false;
    for (const request of scheduled) {
      if (planned && request.identifier === planned.identifier && request.content.data?.signature === planned.data.signature) {
        isScheduled = true;
      } else {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
      }
    }

    if (planned && !isScheduled) {
      await ensureChannels();
      await schedule(Notifications, planned);
    }
  });
}

// Removes every reminder of the app, scheduled or already shown. Meal reminders
// name the user's meals, so logout calls this.
export function cancelAllReminders() {
  return enqueue(async () => {
    if (!Notifications) {
      return;
    }
    const scheduled = (await Notifications.getAllScheduledNotificationsAsync()).filter(isAppReminder);
    for (const request of scheduled) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
    await dismissPresented(Notifications, isAppReminder);
  });
}

// Calls onOpen when the user taps one of the app's reminders, including the one
// that launched the app. Returns the unsubscribe function.
export function onReminderOpened(onOpen: () => void) {
  if (!Notifications) {
    return () => undefined;
  }
  const notifications = Notifications;
  const handle = (response: NotificationsModule.NotificationResponse | null) => {
    if (response && isAppReminder(response.notification.request)) {
      // Handled once, so logging in again later doesn't reopen it.
      notifications.clearLastNotificationResponse();
      onOpen();
    }
  };

  handle(notifications.getLastNotificationResponse());
  const subscription = notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
