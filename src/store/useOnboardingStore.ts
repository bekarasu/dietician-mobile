import { create } from 'zustand';

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
  targetWaterMl: '2500',
  targetCoffeeCups: '3',
  bloodTestUploaded: false,
};

interface OnboardingState {
  draft: OnboardingDraft;
  currentPageIndex: number;
  isCompleted: boolean;
  isSubmitting: boolean;
  error: string | null;
  responses: Partial<Record<OnboardingPageId, OnboardingPageResponse>>;
  updateField: <K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) => void;
  mergeDraft: (patch: Partial<OnboardingDraft>) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  submitPage: (pageId: OnboardingPageId) => Promise<OnboardingPageResponse | null>;
  completeOnboarding: () => void;
  restartOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  draft: initialDraft,
  currentPageIndex: 0,
  isCompleted: false,
  isSubmitting: false,
  error: null,
  responses: {},
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
    set({ isCompleted: true });
  },
  restartOnboarding: () => {
    set({
      draft: initialDraft,
      currentPageIndex: 0,
      isCompleted: false,
      isSubmitting: false,
      error: null,
      responses: {},
    });
  },
}));