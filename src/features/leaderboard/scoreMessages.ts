import { Leaderboard, LeaderboardEntry } from '../../types/models';

const LOGGING_NUDGE = 'Logging your meals, water and weight keeps your score up to date.';

// Keyed by the statusReason values progress-service returns.
const STATUS_MESSAGES: Record<string, string> = {
  no_profile: 'Complete your profile to join the leaderboard.',
  goal_not_weight_loss: 'Leaderboards only score weight-loss goals for now, so your goal isn\'t ranked.',
  no_program: 'Start a diet plan to join the leaderboard.',
  plan_not_started: 'Your score starts counting on the day your diet plan starts.',
  no_plan_on_day: 'No plan covered this day, so it doesn\'t earn points.',
  underage: 'Leaderboards are for members aged 18 and over.',
  missing_target: 'Add a target weight to your profile to get a score.',
  unsafe_target: 'Your target weight is below the healthy range for your height, so it can\'t be ranked. You can review it in your profile.',
  target_reached: 'You\'ve reached your target weight, so there\'s nothing to rank this period. Well done!',
  no_baseline: 'Log your weight to get a score for this period.',
  no_current_measurement: 'Log your weight again to get a score for this period.',
  window_too_short: 'There are too few days of logs in this period to give a fair score.',
};

const DEFAULT_STATUS_MESSAGE = 'Your score appears once you\'ve logged your weight and meals.';

export function getStatusMessage(statusReason?: string) {
  return (statusReason && STATUS_MESSAGES[statusReason]) || DEFAULT_STATUS_MESSAGE;
}

function formatPoints(points: number) {
  return `${points} ${points === 1 ? 'point' : 'points'}`;
}

// Comparisons point at logging and steady habits, never at losing weight faster.
export function getComparisonMessage({ currentUser, nextPeriodStart, totalParticipants }: Leaderboard) {
  const { rank, nextRank, pointsToNextRank } = currentUser;

  if (rank === null) {
    return null;
  }
  if (nextPeriodStart !== null) {
    return `You finished #${rank} of ${totalParticipants}.`;
  }
  if (nextRank !== null && pointsToNextRank !== null) {
    return `You're ${formatPoints(pointsToNextRank)} away from #${nextRank}! ${LOGGING_NUDGE}`;
  }
  if (totalParticipants === 1) {
    return `You're the only one with a score so far. ${LOGGING_NUDGE}`;
  }
  return 'You\'re in first place. Keep your routine going!';
}

export function getDifferenceLabel({ isCurrentUser, scoreDifference }: LeaderboardEntry) {
  if (isCurrentUser || scoreDifference === null) {
    return null;
  }
  if (scoreDifference === 0) {
    return 'Tied with you';
  }
  return `${formatPoints(Math.abs(scoreDifference))} ${scoreDifference > 0 ? 'ahead of you' : 'behind you'}`;
}
