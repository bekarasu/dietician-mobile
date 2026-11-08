import type { RemoteMessage } from '@react-native-firebase/messaging';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { AppStackParamList } from '../../navigation/navigationTypes';
import { useAuthStore } from '../../store/useAuthStore';
import { useNotificationStore } from '../../store/useNotificationStore';
import { openNotification, refreshForNotification } from './openNotification';
import { startPushNotifications, usePushNotificationStore } from './pushNotifications';

// A push that arrives while the app is open is also a new unread notification.
function onForegroundMessage(message: RemoteMessage) {
  refreshForNotification(message.data);
  void useNotificationStore.getState().refreshUnreadCount();
}

// Register as soon as login/bootstrap finishes. Keep a tap pending while the
// user completes onboarding or a resumed plan generation owns the navigator.
export function usePushNotificationRegistration(ready: boolean) {
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  useEffect(() => {
    if (!ready || !authenticated) return;
    return startPushNotifications((message) => {
      usePushNotificationStore.setState({ pendingNotification: message });
    }, onForegroundMessage);
  }, [ready, authenticated]);
}

export function usePushNotifications() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const pending = usePushNotificationStore((state) => state.pendingNotification);
  useEffect(() => {
    if (!pending) return;
    usePushNotificationStore.setState({ pendingNotification: null });
    // Opening the push reads the notification in the inbox too. A Firebase
    // Console test has no notificationId.
    const notificationId = pending.data?.notificationId;
    if (typeof notificationId === 'string' && notificationId) {
      void useNotificationStore.getState().markRead(notificationId);
    }
    openNotification(navigation, pending.data);
  }, [navigation, pending]);
}
