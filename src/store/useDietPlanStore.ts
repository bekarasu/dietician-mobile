import { create } from 'zustand';

import { runPlanGeneration } from '../features/dietPlan/planGeneration';
import { recommendationService } from '../services/recommendationService';
import { DietPlan, PlanCheckIn, PlanGeneration } from '../types/models';

interface DietPlanState {
  activePlan: DietPlan | null;
  isLoading: boolean;
  // A generation an earlier session left running, found at launch. RootNavigator
  // shows GeneratingDietPlanScreen until it ends.
  resumedGeneration: PlanGeneration | null;
  fetchActivePlan: () => Promise<void>;
  // Runs once, at launch.
  checkGeneration: () => Promise<void>;
  clearResumedGeneration: () => void;
  updateActiveDietPlan: (feedback: string, dayToUpdate?: number) => Promise<void>;
  renewActivePlan: (checkIn: PlanCheckIn) => Promise<void>;
  setActivePlan: (plan: DietPlan | null) => void;
}

export const useDietPlanStore = create<DietPlanState>((set, get) => ({
  activePlan: null,
  isLoading: false,
  resumedGeneration: null,
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
  checkGeneration: async () => {
    try {
      const generation = await recommendationService.getPlanGeneration();
      set({ resumedGeneration: generation?.status === 'running' ? generation : null });
    } catch (e) {
      // The app opens as usual, and the plan shows once the server has saved it.
      console.error('Failed to check plan generation', e);
    }
  },
  clearResumedGeneration: () => set({ resumedGeneration: null }),
  updateActiveDietPlan: async (feedback: string, dayToUpdate?: number) => {
    set({ isLoading: true });
    try {
      await runPlanGeneration(() => recommendationService.updateActiveDietPlan(feedback, dayToUpdate));
      await get().fetchActivePlan();
    } catch (e) {
      console.error('Failed to update active diet plan', e);
    } finally {
      set({ isLoading: false });
    }
  },
  renewActivePlan: async (checkIn) => {
    await runPlanGeneration(() => recommendationService.renewDietPlan(checkIn));
    await get().fetchActivePlan();
  },
  setActivePlan: (plan) => set({ activePlan: plan }),
}));
