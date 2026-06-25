import { OnboardingDraft, OnboardingPageId, OnboardingPageResponse } from '../types/models';

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
      case 'habits':
        return {
          pageId,
          message: `Hydration targets synced. Daily targets are ${draft.targetWaterMl || '0'} ml water and ${draft.targetCoffeeCups || '0'} coffee cups.`,
        };
      default:
        return {
          pageId,
          message: 'Onboarding page synced.',
        };
    }
  },
};