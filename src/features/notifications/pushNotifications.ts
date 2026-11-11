import type { RemoteMessage } from '@react-native-firebase/messaging';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { t } from '../../i18n';
import { create } from 'zustand';

import { deviceService } from '../../services/deviceService';
import { getReminderPermission, ReminderPermission, requestReminderPermission } from '../reminders/mealReminders';
import { firebaseMessaging as api } from './firebaseMessaging';

const ENABLED_KEY = 'PUSH_NOTIFICATIONS_ENABLED';

interface PushState {
  enabled: boolean;
  permission: ReminderPermission;
  token: string | null;
  registered: boolean;
  busy: boolean;
  error: string | null;
  pendingNotification: RemoteMessage | null;
}

export const usePushNotificationStore = create<PushState>(() => ({
  enabled: true,
  permission: 'unavailable',
  token: null,
  registered: false,
  busy: false,
  error: null,
  pendingNotification: null,
}));

interface PushSession {
  active: boolean;
  loaded: boolean;
  pendingOpen: RemoteMessage | null;
  unsubscribe: (() => void)[];
}

let session: PushSession | null = null;
// Serialize registration and removal. Logout invalidates the session before
// draining this queue, so an in-flight PUT cannot re-register after removal.
let queue: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>) {
  queue = queue.then(task).catch((error) => {
    console.warn('Push notification sync failed', error);
    usePushNotificationStore.setState({ error: t('notifications.push.updateFailed') });
  }).finally(() => usePushNotificationStore.setState({ busy: false }));
  return queue;
}

async function removeRegistration() {
  const token = usePushNotificationStore.getState().token;
  try {
    if (token) {
      await deviceService.unregister(token);
    }
  } finally {
    // Try revoking the FCM token even if the backend cannot be reached.
    if (api) {
      const messaging = api.getMessaging();
      await api.setAutoInitEnabled(messaging, false);
      await api.deleteToken(messaging);
    }
    usePushNotificationStore.setState({ token: null, registered: false });
  }
}

export function syncPushNotifications(askPermission = false) {
  const current = session;
  return enqueue(async () => {
    if (!api || !current?.active || !current.loaded) {
      return;
    }
    usePushNotificationStore.setState({ busy: true, error: null });
    let permission = await getReminderPermission();
    usePushNotificationStore.setState({ permission });
    if (!current.active) {
      return;
    }
    if (!usePushNotificationStore.getState().enabled) {
      await removeRegistration();
      return;
    }
    if (askPermission && permission === 'ask' && current.active) {
      permission = await requestReminderPermission();
    }
    usePushNotificationStore.setState({ permission });
    if (!current.active) {
      return;
    }
    if (permission !== 'granted') {
      await removeRegistration();
      return;
    }

    const messaging = api.getMessaging();
    await api.setAutoInitEnabled(messaging, true);
    if (!current.active || !usePushNotificationStore.getState().enabled) {
      return;
    }
    if (!api.isDeviceRegisteredForRemoteMessages(messaging)) {
      await api.registerDeviceForRemoteMessages(messaging);
    }
    if (!current.active || !usePushNotificationStore.getState().enabled) {
      return;
    }
    // getToken returns an FCM token, never the raw APNs device token.
    const token = await api.getToken(messaging);
    if (!current.active || !usePushNotificationStore.getState().enabled) {
      return;
    }
    usePushNotificationStore.setState({ token, registered: false });
    await deviceService.register(token, 'ios');
    if (current.active) {
      usePushNotificationStore.setState({ registered: true });
    }
  });
}

function dispose(current: PushSession) {
  current.active = false;
  current.unsubscribe.splice(0).forEach((unsubscribe) => unsubscribe());
  if (session === current) {
    session = null;
  }
}

export function startPushNotifications(onOpened: (message: RemoteMessage) => void, onMessage: (message: RemoteMessage) => void) {
  if (!api) {
    return () => undefined;
  }
  if (session) {
    dispose(session);
  }
  const current: PushSession = { active: true, loaded: false, pendingOpen: null, unsubscribe: [] };
  session = current;
  const messaging = api.getMessaging();
  const canHandle = () => current.active && current.loaded && usePushNotificationStore.getState().enabled;
  const seen = new Set<string>();
  const open = (message: RemoteMessage) => {
    if (current.active && !current.loaded) {
      current.pendingOpen = message;
      return;
    }
    if (!canHandle() || (message.messageId && seen.has(message.messageId))) {
      return;
    }
    if (message.messageId) {
      seen.add(message.messageId);
    }
    onOpened(message);
  };
  current.unsubscribe.push(
    api.onTokenRefresh(messaging, () => { void syncPushNotifications(); }),
    api.onNotificationOpenedApp(messaging, open),
    api.onMessage(messaging, (message) => { if (canHandle()) onMessage(message); }),
  );
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void syncPushNotifications();
    }
  });
  current.unsubscribe.push(() => appState.remove());

  void SecureStore.getItemAsync(ENABLED_KEY).then(async (saved) => {
    if (!current.active) {
      return;
    }
    usePushNotificationStore.setState({ enabled: saved !== 'false' });
    current.loaded = true;
    if (current.pendingOpen) {
      open(current.pendingOpen);
      current.pendingOpen = null;
    }
    void syncPushNotifications(true);
    // Opening a notification must not wait for a network registration retry.
    const initial = await api?.getInitialNotification(messaging);
    if (initial) {
      open(initial);
    }
  }).catch((error) => {
    console.warn('Push notification startup failed', error);
    usePushNotificationStore.setState({ error: t('notifications.push.startFailed') });
  });

  return () => dispose(current);
}

export async function setPushNotificationsEnabled(enabled: boolean) {
  try {
    await SecureStore.setItemAsync(ENABLED_KEY, String(enabled));
    usePushNotificationStore.setState({ enabled });
    await syncPushNotifications(enabled);
  } catch (error) {
    console.warn('Push notification preference failed', error);
    usePushNotificationStore.setState({ error: t('notifications.push.preferenceFailed') });
  }
}

// Called while auth tokens still exist, before the backend logout request.
export function stopPushNotifications() {
  if (session) {
    dispose(session);
  }
  usePushNotificationStore.setState({ pendingNotification: null });
  return enqueue(async () => {
    await removeRegistration();
  });
}
