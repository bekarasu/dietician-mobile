import { Leaderboard, LeaderboardPeriod, LeaderboardScope, ScoreBreakdown } from '../types/models';
import { fetchData } from './apiClient';

const API_URL = process.env.EXPO_PUBLIC_PROGRESS_API_URL;

export const LEADERBOARD_PAGE_SIZE = 50;

export const leaderboardService = {
  getLeaderboard(scope: LeaderboardScope, period: LeaderboardPeriod, periodStart?: string, offset = 0): Promise<Leaderboard> {
    const query = new URLSearchParams({ period, limit: String(LEADERBOARD_PAGE_SIZE), offset: String(offset) });
    if (periodStart) {
      query.set('periodStart', periodStart);
    }
    return fetchData<Leaderboard>(`${API_URL}/leaderboards/${scope}?${query}`);
  },

  getScoreBreakdown(period: LeaderboardPeriod, periodStart: string): Promise<ScoreBreakdown> {
    const query = new URLSearchParams({ period, periodStart });
    return fetchData<ScoreBreakdown>(`${API_URL}/scores/me/breakdown?${query}`);
  },
};
