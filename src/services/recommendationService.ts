import { fetchWithAuth } from './apiClient';
import { AI_GUIDANCE_NOTICE } from '../constants/health';
import { MealRecommendation, RecommendationInput } from '../types/models';
import { formatGoalType } from '../utils/formatters';

function getIngredientFallback(input: RecommendationInput) {
  const items = input.inventory.slice(0, 3).map((item) => item.productName.toLowerCase());
  return items.length > 0 ? items.join(', ') : 'lean protein, vegetables, and fruit';
}

// This shape intentionally keeps recommendation context explicit so an AI provider can be swapped in later.
const API_URL = process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL;

export const recommendationService = {
  async createDietPlan(userId: string) {
    if (!API_URL) throw new Error('Recommendation API URL is not defined');
    
    // Create basic default meals payload as required by backend DTO
    const defaultMeals = [
      { mealType: 'Breakfast', name: 'Starting Breakfast' },
      { mealType: 'Lunch', name: 'Starting Lunch' },
      { mealType: 'Dinner', name: 'Starting Dinner' }
    ];

    const response = await fetchWithAuth(`${API_URL}/diet-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        startDate: new Date().toISOString(),
        meals: defaultMeals
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create diet plan');
    }

    return response.json();
  },

  buildRecoveryRecommendation(calories: number) {
    if (calories >= 900) {
      return 'You went well above plan today. Favor a protein-forward meal with vegetables, hydrate, and return to your normal structure tomorrow without severe restriction.';
    }

    if (calories >= 500) {
      return 'You consumed more calories than planned today. Consider a lighter dinner with high protein and vegetables. Avoid aggressive restriction.';
    }

    return 'Keep the next meal balanced and resume your usual plan. Focus on fiber, protein, and hydration rather than compensation.';
  },

  async generateRecommendation(input: RecommendationInput): Promise<MealRecommendation> {
    const ingredients = getIngredientFallback(input);
    const lastLog = input.dailyLogs[0];
    const hydrationGap = Math.max(input.hydration.targetWaterMl - input.hydration.waterMl, 0);

    return {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      title: `${formatGoalType(input.goalType)} support plan`,
      summary: `Use ${ingredients} to build a low-friction day that supports ${formatGoalType(input.goalType).toLowerCase()} while staying practical at home.`,
      meals: [
        'Breakfast: yogurt bowl with fruit and seeds',
        'Lunch: chicken and spinach grain bowl with olive oil dressing',
        `Dinner: vegetable-heavy skillet using ${ingredients}`,
      ],
      rationale: [
        'Inventory-first meal ideas reduce decision fatigue and food waste.',
        lastLog
          ? `Recent log context (${lastLog.foodName}) suggests a balanced follow-up meal is more useful than compensation.`
          : 'No recent over-consumption log was detected, so the plan stays neutral and habit-oriented.',
        hydrationGap > 0
          ? `There is still a ${hydrationGap} ml hydration gap today, so fluid intake is part of the recovery plan.`
          : 'Hydration is already near target, so the plan focuses on structure and protein coverage.',
      ],
      disclaimer: AI_GUIDANCE_NOTICE,
    };
  },
};