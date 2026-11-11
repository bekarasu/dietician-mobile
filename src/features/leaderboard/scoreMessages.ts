import { t, translateIfExists } from '../../i18n';
import { Leaderboard, LeaderboardEntry } from '../../types/models';

// Keyed by the statusReason values progress-service returns, under
// leaderboard.status. no_current_measurement only appears on scores from before
// a missing weigh-in counted as no loss.
export function getStatusMessage(statusReason?: string) {
  return (statusReason && translateIfExists(`leaderboard.status.${statusReason}`)) || t('leaderboard.status.default');
}

function formatPoints(points: number) {
  return t('leaderboard.points', { count: points });
}

// Comparisons point at logging and steady habits, never at losing weight faster.
export function getComparisonMessage({ currentUser, nextPeriodStart, totalParticipants }: Leaderboard) {
  const { rank, nextRank, pointsToNextRank } = currentUser;

  if (rank === null) {
    return null;
  }
  if (nextPeriodStart !== null) {
    return t('leaderboard.comparison.finished', { rank, total: totalParticipants });
  }
  if (nextRank !== null && pointsToNextRank !== null) {
    return t('leaderboard.comparison.away', { points: formatPoints(pointsToNextRank), rank: nextRank, nudge: t('leaderboard.comparison.nudge') });
  }
  if (totalParticipants === 1) {
    return t('leaderboard.comparison.only', { nudge: t('leaderboard.comparison.nudge') });
  }
  return t('leaderboard.comparison.first');
}

export function getDifferenceLabel({ isCurrentUser, scoreDifference }: LeaderboardEntry) {
  if (isCurrentUser || scoreDifference === null) {
    return null;
  }
  if (scoreDifference === 0) {
    return t('leaderboard.difference.tied');
  }
  const points = formatPoints(Math.abs(scoreDifference));
  return scoreDifference > 0 ? t('leaderboard.difference.ahead', { points }) : t('leaderboard.difference.behind', { points });
}
