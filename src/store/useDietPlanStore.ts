import { create } from 'zustand';

import { recommendationService } from '../services/recommendationService';
import { DietPlan, PlanCheckIn } from '../types/models';

interface DietPlanState {
  activePlan: DietPlan | null;
  isLoading: boolean;
  fetchActivePlan: () => Promise<void>;
  updateActiveDietPlan: (feedback: string, dayToUpdate?: number) => Promise<void>;
  renewActivePlan: (checkIn: PlanCheckIn) => Promise<void>;
  setActivePlan: (plan: DietPlan | null) => void;
}

export const useDietPlanStore = create<DietPlanState>((set, get) => ({
  activePlan: null,
  isLoading: false,
  fetchActivePlan: async () => {
    set({ isLoading: true });
    try {
      const response = await recommendationService.getActiveDietPlan();
      // Backend returns { message: string, data: DietPlan } or null
      set({ activePlan: response?.data || null });
    } catch (e) {
      // Keep what's on screen: the plan screen refetches on every focus, and a
      // failed refresh doesn't mean the plan is gone. A real 404 arrives as null.
      console.error('Failed to fetch active diet plan', e);
    } finally {
      set({ isLoading: false });
    }
  },
  updateActiveDietPlan: async (feedback: string, dayToUpdate?: number) => {
    set({ isLoading: true });
    try {
      const response = await recommendationService.updateActiveDietPlan(feedback, dayToUpdate);
      set({ activePlan: response?.data || null });
    } catch (e) {
      console.error('Failed to update active diet plan', e);
    } finally {
      set({ isLoading: false });
    }
  },
  renewActivePlan: async (checkIn) => {
    await recommendationService.renewDietPlan(checkIn);
    await get().fetchActivePlan();
  },
  setActivePlan: (plan) => set({ activePlan: plan }),
}));
