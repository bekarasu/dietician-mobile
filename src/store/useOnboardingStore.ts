import { create } from 'zustand';

import type { AppTabParamList } from '../navigation/navigationTypes';
import { onboardingService } from '../services/onboardingService';
import { OnboardingDraft, OnboardingPageId, OnboardingPageResponse } from '../types/models';

const initialDraft: OnboardingDraft = {
  name: '',
  age: '',
  heightCm: '',
  weightKg: '',
  targetWeightKg: '',
  gender: '',
  activityLevel: '',
  goalType: 'habit_building',
  dietaryPreferences: [],
  dislikedFoods: '',
  allergies: '',
  dailyCalorieTarget: '',
  bloodTestUploaded: false,
};

const freshPages = {
  draft: initialDraft,
  currentPageIndex: 0,
  isSubmitting: false,
  error: null,
  responses: {},
};

interface OnboardingState {
  draft: OnboardingDraft;
  currentPageIndex: number;
  isCompleted: boolean;
  // Onboarding was run again from the profile, so the user can leave it.
  isRestarting: boolean;
  // The tab the app opens on when onboarding ends. AppTabNavigator reads it once.
  landingTab: keyof AppTabParamList | null;
  isSubmitting: boolean;
  error: string | null;
  responses: Partial<Record<OnboardingPageId, OnboardingPageResponse>>;
  updateField: <K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) => void;
  mergeDraft: (patch: Partial<OnboardingDraft>) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  submitPage: (pageId: OnboardingPageId) => Promise<OnboardingPageResponse | null>;
  completeOnboarding: () => void;
  restoreOnboardingState: () => void;
  clearLandingTab: () => void;
  restartOnboarding: () => void;
  leaveOnboarding: (landingTab?: keyof AppTabParamList) => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  ...freshPages,
  isCompleted: false,
  isRestarting: false,
  landingTab: null,
  updateField: (field, value) => {
    set((state) => ({
      draft: {
        ...state.draft,
        [field]: value,
      },
    }));
  },
  mergeDraft: (patch) => {
    set((state) => ({
      draft: {
        ...state.draft,
        ...patch,
      },
    }));
  },
  goToNextPage: () => {
    set((state) => ({ currentPageIndex: state.currentPageIndex + 1 }));
  },
  goToPreviousPage: () => {
    set((state) => ({ currentPageIndex: Math.max(state.currentPageIndex - 1, 0) }));
  },
  submitPage: async (pageId) => {
    set({ isSubmitting: true, error: null });

    try {
      const response = await onboardingService.submitPage(pageId, get().draft);

      set((state) => ({
        isSubmitting: false,
        draft: response.patch
          ? {
              ...state.draft,
              ...response.patch,
            }
          : state.draft,
        responses: {
          ...state.responses,
          [pageId]: response,
        },
      }));

      return response;
    } catch (error) {
      set({
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Unable to submit onboarding page.',
      });

      return null;
    }
  },
  completeOnboarding: () => {
    set({ isCompleted: true, isRestarting: false, landingTab: 'DietPlan' });
  },
  restoreOnboardingState: () => {
    set({ isCompleted: true, isRestarting: false, landingTab: null });
  },
  clearLandingTab: () => {
    set({ landingTab: null });
  },
  restartOnboarding: () => {
    set({ ...freshPages, isCompleted: false, isRestarting: true, landingTab: null });
  },
  // Back to the app without a new plan, on the profile unless told otherwise.
  // Answers are saved only by the last page, so leaving before it changes nothing.
  leaveOnboarding: (landingTab = 'ProfileGoals') => {
    set({ ...freshPages, isCompleted: true, isRestarting: false, landingTab });
  },
}));