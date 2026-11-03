import { ONBOARDING_PAGES } from '../features/onboarding/onboardingPages';
import { OnboardingDraft, OnboardingPageId, OnboardingPageResponse } from '../types/models';
import { formatLitres } from '../utils/formatters';
import { fetchWithAuth } from './apiClient';
import { profileService } from './profileService';
import { useProgressStore } from '../store/useProgressStore';

const API_URL = `${process.env.EXPO_PUBLIC_ACCOUNT_API_URL}/profiles`;

function buildGoalSuggestion(draft: OnboardingDraft) {
  const currentWeight = Number(draft.weightKg) || 0;
  const targetWeight = Number(draft.targetWeightKg) || currentWeight;
  const delta = Math.abs(currentWeight - targetWeight);

  if (!draft.dailyCalorieTarget) {
    if (draft.goalType === 'weight_loss') {
      return Math.max(1600, 2200 - Math.round(delta * 35));
    }

    if (draft.goalType === 'body_recomposition') {
      return 2200;
    }

    if (draft.goalType === 'maintenance') {
      return 2400;
    }

    return 2100;
  }

  return undefined;
}

// The last page saves the whole profile. The server sets the water target and
// coffee limit from weight and age, so they aren't sent.
async function submitOnboarding(pageId: OnboardingPageId, draft: OnboardingDraft): Promise<OnboardingPageResponse> {
  try {
    const response = await fetchWithAuth(`${API_URL}/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: draft.name,
        age: Number(draft.age),
        heightCm: Number(draft.heightCm),
        weightKg: Number(draft.weightKg),
        targetWeightKg: Number(draft.targetWeightKg),
        gender: draft.gender,
        activityLevel: draft.activityLevel,
        goalType: draft.goalType,
        dietaryPreferences: draft.dietaryPreferences,
        dislikedFoods: draft.dislikedFoods,
        allergies: draft.allergies,
        dailyCalorieTarget: draft.dailyCalorieTarget ? Number(draft.dailyCalorieTarget) : undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Onboarding sync failed', err);
      throw new Error('Failed to sync onboarding data');
    }

    if (draft.weightKg) {
      await useProgressStore.getState().addWeightLog(Number(draft.weightKg), 'Initial weight from onboarding');
    }

    const profile = await profileService.getProfile();
    const targets =
      profile?.targetWaterMl && profile.targetCoffeeCups !== undefined
        ? ` Your daily targets are ${formatLitres(profile.targetWaterMl)} of water and at most ${profile.targetCoffeeCups} cups of coffee, set from your weight and age.`
        : '';

    return {
      pageId,
      message: `Profile saved.${targets}`,
      profile: profile || undefined,
    };
  } catch (error) {
    console.error('Error submitting onboarding data:', error);
    throw error;
  }
}

const LAST_PAGE_ID = ONBOARDING_PAGES[ONBOARDING_PAGES.length - 1].id;

// Replace this mock with a backend endpoint when onboarding needs persistence or AI orchestration.
export const onboardingService = {
  async submitPage(pageId: OnboardingPageId, draft: OnboardingDraft): Promise<OnboardingPageResponse> {
    if (pageId === LAST_PAGE_ID) {
      return submitOnboarding(pageId, draft);
    }

    await new Promise((resolve) => setTimeout(resolve, 250));

    switch (pageId) {
      case 'basics':
        return {
          pageId,
          message: `Profile basics captured for ${draft.name || 'this user'}. Later versions can validate these fields against backend profile rules.`,
        };
      case 'goals': {
        const suggestedCalorieTarget = buildGoalSuggestion(draft);

        return {
          pageId,
          message:
            suggestedCalorieTarget !== undefined
              ? `Goal context synced. A provisional calorie target of ${suggestedCalorieTarget} kcal was suggested from your goal and weight delta.`
              : 'Goal context synced. Your explicit calorie target was kept as the source of truth.',
          patch:
            suggestedCalorieTarget !== undefined
              ? { dailyCalorieTarget: String(suggestedCalorieTarget) }
              : undefined,
        };
      }
      case 'preferences':
        return {
          pageId,
          message:
            draft.dietaryPreferences.length > 0
              ? `Preference filters synced. Future recommendations will respect ${draft.dietaryPreferences.join(', ')}.`
              : 'Preference filters synced. No dietary filter was selected yet.',
        };
      default:
        return {
          pageId,
          message: 'Onboarding page synced.',
        };
    }
  },
};