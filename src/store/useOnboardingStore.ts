import { create } from 'zustand';

import { isOnboardingComplete } from '../features/onboarding/validation';
import { t } from '../i18n';
import type { AppTabParamList } from '../navigation/navigationTypes';
import { bloodTestService } from '../services/bloodTestService';
import { onboardingService } from '../services/onboardingService';
import { OnboardingDraft, OnboardingPageId, OnboardingPageResponse } from '../types/models';
import { useProfileStore } from './useProfileStore';
import { useProgressStore } from './useProgressStore';

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
  specialPrograms: [],
  pregnancyWeek: '',
  countryCode: '',
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
  hasSavedAnswers: false,
  bloodTestUploadIds: [],
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
  // The answers are on the profile, and the server can still put back what they
  // replaced. Until the plan is created, or a cancelled one reverts them.
  hasSavedAnswers: boolean;
  // Blood tests uploaded during this onboarding, which leaving it removes.
  bloodTestUploadIds: string[];
  updateField: <K extends keyof OnboardingDraft>(field: K, value: OnboardingDraft[K]) => void;
  mergeDraft: (patch: Partial<OnboardingDraft>) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  submitPage: (pageId: OnboardingPageId) => Promise<OnboardingPageResponse | null>;
  addBloodTestUpload: (id: string) => void;
  // Saves the answers right before generating the plan they're for. Throws on failure.
  saveAnswers: () => Promise<void>;
  // Puts the profile back as it was before saveAnswers, for a cancelled plan.
  // Throws on failure, and the answers count as saved until it succeeds.
  revertAnswers: () => Promise<void>;
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
        error: error instanceof Error ? error.message : t('onboarding.submitFailed'),
      });

      return null;
    }
  },
  addBloodTestUpload: (id) => {
    set((state) => ({ bloodTestUploadIds: [...state.bloodTestUploadIds, id] }));
  },
  saveAnswers: async () => {
    // A save a cancelled plan couldn't revert yet goes first, or the server would
    // keep it in place of the profile from before onboarding.
    if (get().hasSavedAnswers) {
      await get().revertAnswers();
    }

    await onboardingService.saveAnswers(get().draft);
    set({ hasSavedAnswers: true });

    // HomeScreen takes the water and coffee targets the server set from the
    // profile. Without them for now, the plan can still be generated.
    await useProfileStore
      .getState()
      .refresh()
      .catch((error) => console.error('Failed to reload the profile after onboarding', error));
  },
  revertAnswers: async () => {
    await onboardingService.revertAnswers();
    set({ hasSavedAnswers: false });
    await useProfileStore.getState().refresh();

    // Opened at launch for a plan an earlier session left generating, someone
    // who had no answers before that onboarding goes through it again.
    if (get().isCompleted && !isOnboardingComplete(useProfileStore.getState().profile)) {
      set({ ...freshPages, isCompleted: false, isRestarting: false, landingTab: null });
    }
  },
  completeOnboarding: () => {
    // The answers stay now, so the weight they start from is logged.
    const { draft, hasSavedAnswers } = get();
    if (hasSavedAnswers && draft.weightKg) {
      void useProgressStore.getState().addWeightLog(Number(draft.weightKg), t('onboarding.initialWeightNote'));
    }
    set({ isCompleted: true, isRestarting: false, landingTab: 'DietPlan', hasSavedAnswers: false, bloodTestUploadIds: [] });
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
  // Answers are saved only when the plan is created, so all that's left to undo
  // is blood tests uploaded here, and answers a cancelled plan couldn't revert.
  // The app doesn't wait for either.
  leaveOnboarding: (landingTab = 'ProfileGoals') => {
    const { bloodTestUploadIds, hasSavedAnswers, revertAnswers } = get();
    bloodTestUploadIds.forEach((id) => {
      bloodTestService.deleteUpload(id).catch((error) => console.error('Failed to remove a blood test from onboarding', error));
    });
    if (hasSavedAnswers) {
      revertAnswers().catch((error) => console.error('Failed to revert onboarding answers', error));
    }
    set({ ...freshPages, isCompleted: true, isRestarting: false, landingTab });
  },
}));