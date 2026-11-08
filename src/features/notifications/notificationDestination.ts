export type NotificationDestination = 'Friends' | 'SharedPlan' | 'DietPlan' | 'Home';

export function notificationDestination(data?: { [key: string]: unknown }): NotificationDestination {
  switch (data?.type) {
    case 'friendship.request_received':
    case 'friendship.request_accepted':
      return 'Friends';
    case 'sharedplan.invite_received':
      return 'SharedPlan';
    case 'dietplan.ready':
      return 'DietPlan';
    default:
      return 'Home';
  }
}
