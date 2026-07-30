import { OnboardingDraft, OnboardingPageId, OnboardingPageResponse } from '../types/models';
import { tokenService } from './tokenService';

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

// Replace this mock with a backend endpoint when onboarding needs persistence or AI orchestration.
export const onboardingService = {
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
      case 'habits': {
        try {
          const token = await tokenService.getAccessToken();
          const response = await fetch(`${API_URL}/onboarding`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
              targetWaterMl: Number(draft.targetWaterMl),
              targetCoffeeCups: Number(draft.targetCoffeeCups),
            }),
          });

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error('Onboarding sync failed', err);
            throw new Error('Failed to sync onboarding data');
          }

          const responseData = await response.json();

          return {
            pageId,
            message: `Hydration targets synced. Daily targets are ${draft.targetWaterMl || '0'} ml water and ${draft.targetCoffeeCups || '0'} coffee cups.`,
            profile: {
              ...responseData.data,
              // map camelCase mapping if needed, assuming backend returned it as such
              heightCm: responseData.data.heightCm,
              weightKg: responseData.data.weightKg,
              targetWeightKg: responseData.data.targetWeightKg,
              goalType: responseData.data.goal,
              dailyCalorieTarget: responseData.data.dailyCalorieTarget,
              // Note: preferences/dislikedFoods are not part of the UserProfile backend response struct, 
              // we will populate them from the draft to keep the UI up-to-date.
              dietaryPreferences: draft.dietaryPreferences,
              dislikedFoods: draft.dislikedFoods ? draft.dislikedFoods.split(',').map(s => s.trim()) : [],
              allergies: draft.allergies ? draft.allergies.split(',').map(s => s.trim()) : [],
            },
          };
        } catch (error) {
          console.error('Error submitting onboarding data:', error);
          throw error;
        }
      }
      default:
        return {
          pageId,
          message: 'Onboarding page synced.',
        };
    }
  },
};