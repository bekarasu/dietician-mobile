import type { RemoteMessage } from '@react-native-firebase/messaging';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect } from 'react';

import { AppStackParamList } from '../../navigation/navigationTypes';
import { useDietPlanStore } from '../../store/useDietPlanStore';
import { useAuthStore } from '../../store/useAuthStore';
import { leaderboardTarget, notificationDestination } from './notificationDestination';
import { startPushNotifications, usePushNotificationStore } from './pushNotifications';

function refreshPlan(message: RemoteMessage) {
  if (message.data?.type === 'dietplan.ready') {
    void useDietPlanStore.getState().fetchActivePlan();
  }
}

// Register as soon as login/bootstrap finishes. Keep a tap pending while the
// user completes onboarding or a resumed plan generation owns the navigator.
export function usePushNotificationRegistration(ready: boolean) {
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  useEffect(() => {
    if (!ready || !authenticated) return;
    return startPushNotifications((message) => {
      usePushNotificationStore.setState({ pendingNotification: message });
    }, refreshPlan);
  }, [ready, authenticated]);
}

export function usePushNotifications() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const pending = usePushNotificationStore((state) => state.pendingNotification);
  useEffect(() => {
    if (!pending) return;
    usePushNotificationStore.setState({ pendingNotification: null });
    refreshPlan(pending);
    const destination = notificationDestination(pending.data);
    if (destination === 'Friends' || destination === 'SharedPlan') {
      navigation.navigate(destination);
    } else if (destination === 'Leaderboard') {
      navigation.navigate('Tabs', { screen: 'Leaderboard', params: leaderboardTarget(pending.data) });
    } else {
      navigation.navigate('Tabs', { screen: destination });
    }
  }, [navigation, pending]);
}
