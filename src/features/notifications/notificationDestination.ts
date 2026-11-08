import type { LeaderboardTarget } from '../../navigation/navigationTypes';

export type NotificationDestination = 'Friends' | 'SharedPlan' | 'DietPlan' | 'Leaderboard' | 'Home';

export function notificationDestination(data?: { [key: string]: unknown }): NotificationDestination {
  switch (data?.type) {
    case 'friendship.request_received':
    case 'friendship.request_accepted':
      return 'Friends';
    case 'sharedplan.invite_received':
    case 'sharedplan.invite_accepted':
      return 'SharedPlan';
    case 'dietplan.ready':
      return 'DietPlan';
    case 'score.weekly_result':
    case 'score.monthly_result':
      return 'Leaderboard';
    default:
      return 'Home';
  }
}

// A score result names the period it's about and the ranking its text quoted,
// so the tap shows the same ranking.
export function leaderboardTarget(data?: { [key: string]: unknown }): LeaderboardTarget {
  const target: LeaderboardTarget = {};
  if (data?.scope === 'friends' || data?.scope === 'global') {
    target.scope = data.scope;
  }
  if (data?.periodType === 'weekly' || data?.periodType === 'monthly') {
    target.period = data.periodType;
    if (typeof data.periodStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.periodStart)) {
      target.periodStart = data.periodStart;
    }
  }
  return target;
}
