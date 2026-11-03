import { DailyPoints, Leaderboard, LeaderboardPeriod, LeaderboardScope, ScoreBreakdown, WeekActivity } from '../types/models';
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

  // from and to are YYYY-MM-DD, at most 31 days apart.
  getDailyPoints(from: string, to: string): Promise<DailyPoints> {
    const query = new URLSearchParams({ from, to });
    return fetchData<DailyPoints>(`${API_URL}/scores/me/days?${query}`);
  },

  // Without periodStart (a Monday, YYYY-MM-DD), returns the current week.
  getWeekActivity(periodStart?: string): Promise<WeekActivity> {
    const query = periodStart ? `?${new URLSearchParams({ periodStart })}` : '';
    return fetchData<WeekActivity>(`${API_URL}/scores/me/activity${query}`);
  },
};
