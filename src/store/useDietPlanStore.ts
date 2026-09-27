import { create } from 'zustand';

import { recommendationService } from '../services/recommendationService';
import { DietPlan } from '../types/models';

interface DietPlanState {
  activePlan: DietPlan | null;
  isLoading: boolean;
  fetchActivePlan: () => Promise<void>;
  setActivePlan: (plan: DietPlan | null) => void;
}

export const useDietPlanStore = create<DietPlanState>((set) => ({
  activePlan: null,
  isLoading: false,
  fetchActivePlan: async () => {
    set({ isLoading: true });
    try {
      const response = await recommendationService.getActiveDietPlan();
      // Backend returns { message: string, data: DietPlan } or null
      set({ activePlan: response?.data || null });
    } catch (e) {
      console.error('Failed to fetch active diet plan', e);
      set({ activePlan: null });
    } finally {
      set({ isLoading: false });
    }
  },
  setActivePlan: (plan) => set({ activePlan: plan }),
}));
