import { isPregnantDraft } from '../features/onboarding/validation';
import { OnboardingDraft, OnboardingPageId, OnboardingPageResponse } from '../types/models';
import { fetchData } from './apiClient';

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

export const onboardingService = {
  // Saves the answers to the profile, all at once. The server keeps what they
  // replace until the next save, for revertAnswers, and sets the water target
  // and coffee limit from weight, age and pregnancy, so they aren't sent.
  async saveAnswers(draft: OnboardingDraft): Promise<void> {
    await fetchData(`${API_URL}/onboarding`, {
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
        // Always sent, 0 for none, so onboarding can end a pregnancy plan too.
        // The server stores the due date it gives.
        pregnancyWeek: isPregnantDraft(draft) ? Number(draft.pregnancyWeek) : 0,
        // Plans use ingredients that are easy to buy there. Left out, the server
        // keeps what the profile has.
        countryCode: draft.countryCode || undefined,
        dislikedFoods: draft.dislikedFoods,
        allergies: draft.allergies,
        dailyCalorieTarget: draft.dailyCalorieTarget ? Number(draft.dailyCalorieTarget) : undefined,
      }),
    });
  },

  // Puts the profile back as it was before the last saveAnswers. A second call
  // changes nothing.
  async revertAnswers(): Promise<void> {
    await fetchData(`${API_URL}/onboarding`, { method: 'DELETE' });
  },

  // The pages are local: nothing is saved until the plan is created.
  async submitPage(pageId: OnboardingPageId, draft: OnboardingDraft): Promise<OnboardingPageResponse> {
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