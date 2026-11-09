import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppStackParamList } from '../../navigation/navigationTypes';
import { useDietPlanStore } from '../../store/useDietPlanStore';
import { useSharedPlanOfferStore } from '../../store/useSharedPlanOfferStore';
import { leaderboardTarget, notificationDestination } from './notificationDestination';

type NotificationData = { [key: string]: unknown } | undefined;

// A plan that just became ready replaces the one loaded. A shared plan offered
// while the app is open is asked about straight away, unless the notification
// is being opened, which shows it on the Shared Meals screen instead.
export function refreshForNotification(data: NotificationData, isOpening = false) {
  if (data?.type === 'dietplan.ready') {
    void useDietPlanStore.getState().fetchActivePlan();
  } else if (data?.type === 'sharedplan.plan_offered') {
    void useSharedPlanOfferStore
      .getState()
      .load({ seen: isOpening })
      .catch(() => undefined);
  }
}

// Opens the screen a notification is about. A push and the inbox carry the
// same data, so both come through here.
export function openNotification(navigation: NativeStackNavigationProp<AppStackParamList>, data: NotificationData) {
  refreshForNotification(data, true);
  const destination = notificationDestination(data);
  if (destination === 'Friends' || destination === 'SharedPlan') {
    navigation.navigate(destination);
  } else if (destination === 'Leaderboard') {
    navigation.navigate('Tabs', { screen: 'Leaderboard', params: leaderboardTarget(data) });
  } else {
    navigation.navigate('Tabs', { screen: destination });
  }
}
