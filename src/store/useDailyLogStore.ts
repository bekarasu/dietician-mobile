import { create } from 'zustand';

import { mockDailyLogs } from '../services/mocks/mockData';
import { recommendationService } from '../services/recommendationService';
import { DailyFoodLog, DailyFoodLogInput } from '../types/models';

interface DailyLogState {
  logs: DailyFoodLog[];
  bootstrap: () => Promise<void>;
  addLog: (payload: DailyFoodLogInput) => void;
}

export const useDailyLogStore = create<DailyLogState>((set) => ({
  logs: [],
  bootstrap: async () => {
    set({ logs: mockDailyLogs });
  },
  addLog: (payload) => {
    const newLog: DailyFoodLog = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      recoveryRecommendation: recommendationService.buildRecoveryRecommendation(payload.estimatedCalories),
      ...payload,
    };

    set((state) => ({ logs: [newLog, ...state.logs] }));
  },
}));