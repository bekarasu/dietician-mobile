import { FriendCompetitionEntry, ProgressEntry } from '../types/models';
import { fetchWithAuth } from './apiClient';
import { mockFriends } from './mocks/mockData';

const API_URL = `${process.env.EXPO_PUBLIC_PROGRESS_API_URL}/progress`;

export const progressService = {
  async getProgressEntries(): Promise<ProgressEntry[]> {
    try {
      const response = await fetchWithAuth(`${API_URL}/me`);

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();
      const weightLogs = data.data?.weightLogs || [];

      return weightLogs.map((log: any) => ({
        id: log.id,
        date: log.loggedAt,
        weightKg: log.weightKg,
        weeklyConsistency: 0, // Mocked as backend doesn't provide this per log directly
        goalProgress: 0,      // Mocked as well
        note: log.notes,
      })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
      console.error('Error fetching progress entries:', error);
      return [];
    }
  },

  async addWeightEntry(weightKg: number, notes?: string): Promise<ProgressEntry | null> {
    try {
      const response = await fetchWithAuth(`${API_URL}/me/weight`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weightKg,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add weight log');
      }

      const data = await response.json();
      const log = data.data;

      return {
        id: log.id,
        date: log.loggedAt,
        weightKg: log.weightKg,
        weeklyConsistency: 0,
        goalProgress: 0,
        note: log.notes,
      };
    } catch (error) {
      console.error('Error adding weight entry:', error);
      return null;
    }
  },

  async removeWeightEntry(id: string): Promise<boolean> {
    try {
      const response = await fetchWithAuth(`${API_URL}/me/weight/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove weight log');
      }

      return true;
    } catch (error) {
      console.error('Error removing weight entry:', error);
      return false;
    }
  },

  async getFriendCompetition(): Promise<FriendCompetitionEntry[]> {
    return mockFriends;
  },

  async getDailyLog(date: string): Promise<any> {
    try {
      const response = await fetchWithAuth(`${process.env.EXPO_PUBLIC_PROGRESS_API_URL}/daily-logs/${date}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch daily log');
      }
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching daily log:', error);
      return null;
    }
  },

  async getWeeklyDailyLogs(date?: string): Promise<any[]> {
    try {
      const query = date ? `?date=${date}` : '';
      const response = await fetchWithAuth(`${process.env.EXPO_PUBLIC_PROGRESS_API_URL}/daily-logs/weekly${query}`);
      if (!response.ok) {
        throw new Error('Failed to fetch weekly daily logs');
      }
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching weekly daily logs:', error);
      return [];
    }
  },

  async upsertDailyLog(logData: any): Promise<any> {
    try {
      const response = await fetchWithAuth(`${process.env.EXPO_PUBLIC_PROGRESS_API_URL}/daily-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logData),
      });

      if (!response.ok) {
        throw new Error('Failed to upsert daily log');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error upserting daily log:', error);
      return null;
    }
  },
};