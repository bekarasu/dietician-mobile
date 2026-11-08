import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppStackParamList } from '../../navigation/navigationTypes';
import { useDietPlanStore } from '../../store/useDietPlanStore';
import { leaderboardTarget, notificationDestination } from './notificationDestination';

type NotificationData = { [key: string]: unknown } | undefined;

// A plan that just became ready replaces the one loaded.
export function refreshForNotification(data: NotificationData) {
  if (data?.type === 'dietplan.ready') {
    void useDietPlanStore.getState().fetchActivePlan();
  }
}

// Opens the screen a notification is about. A push and the inbox carry the
// same data, so both come through here.
export function openNotification(navigation: NativeStackNavigationProp<AppStackParamList>, data: NotificationData) {
  refreshForNotification(data);
  const destination = notificationDestination(data);
  if (destination === 'Friends' || destination === 'SharedPlan') {
    navigation.navigate(destination);
  } else if (destination === 'Leaderboard') {
    navigation.navigate('Tabs', { screen: 'Leaderboard', params: leaderboardTarget(data) });
  } else {
    navigation.navigate('Tabs', { screen: destination });
  }
}
