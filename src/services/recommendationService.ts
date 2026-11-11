import { fetchData, fetchWithAuth } from './apiClient';
import { ApiError } from './apiError';
import { getAiGuidanceNotice } from '../constants/health';
import { t } from '../i18n';
import { DietPlan, FoodResponse, MealEntry, MealRecommendation, PlanCheckIn, PlanGeneration, RecommendationInput } from '../types/models';
import { formatGoalType } from '../utils/formatters';

function getIngredientFallback(input: RecommendationInput) {
  const items = input.inventory.slice(0, 3).map((item) => item.productName.toLowerCase());
  return items.length > 0 ? items.join(', ') : 'lean protein, vegetables, and fruit';
}

// This shape intentionally keeps recommendation context explicit so an AI provider can be swapped in later.
const API_URL = process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL;

export const recommendationService = {
  async listFoods(): Promise<FoodResponse[]> {
    if (!API_URL) throw new Error('Recommendation API URL is not defined');
    const response = await fetchWithAuth(`${API_URL}/foods`, {
      method: 'GET',
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`List Foods API Error [${response.status}]:`, errorText);
      throw new Error(`Failed to list foods: ${response.status}`);
    }
    const data = await response.json();
    return data.foods;
  },

  async createDietPlan(userId: string, startDate: string, durationDays: number = 7) {
    if (!API_URL) throw new Error('Recommendation API URL is not defined');

    const response = await fetchWithAuth(`${API_URL}/diet-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        startDate,
        durationDays
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create diet plan');
    }

    return response.json();
  },

  async getActiveDietPlan() {
    if (!API_URL) throw new Error('Recommendation API URL is not defined');
    
    const response = await fetchWithAuth(`${API_URL}/diet-plans/active`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch active diet plan');
    }

    return response.json();
  },

  async updateActiveDietPlan(feedback: string, dayToUpdate?: number) {
    if (!API_URL) throw new Error('Recommendation API URL is not defined');

    const response = await fetchWithAuth(`${API_URL}/diet-plans/active/feedback`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feedback,
        dayToUpdate,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update active diet plan');
    }

    return response.json();
  },

  // The user's latest plan generation, or null if they have none.
  async getPlanGeneration(): Promise<PlanGeneration | null> {
    if (!API_URL) throw new Error('Recommendation API URL is not defined');

    const response = await fetchWithAuth(`${API_URL}/diet-plans/generation`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch plan generation');
    }

    const json = await response.json();
    return json.data;
  },

  // Stops the user's running plan generation, so it saves nothing. False if none
  // is running, which includes one already saving its plan.
  async cancelPlanGeneration(): Promise<boolean> {
    if (!API_URL) throw new Error('Recommendation API URL is not defined');

    const response = await fetchWithAuth(`${API_URL}/diet-plans/generation/cancel`, {
      method: 'POST',
    });

    if (!response.ok) {
      if (response.status === 409) return false;
      throw new Error('Failed to cancel plan generation');
    }

    return true;
  },

  renewDietPlan(checkIn: PlanCheckIn) {
    if (!API_URL) throw new Error('Recommendation API URL is not defined');

    return fetchData<DietPlan>(`${API_URL}/diet-plans/active/renew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkIn),
    });
  },

	async markMealAsTaken(mealId: string) {
		if (!API_URL) throw new Error('Recommendation API URL is not defined');

		const response = await fetchWithAuth(`${API_URL}/diet-plans/meals/${mealId}/take`, {
			method: 'PATCH',
		});

		if (!response.ok) {
			throw new Error('Failed to mark meal as taken');
		}

		return response.json();
	},

	// For a shared meal, 'me' makes the new meal the user's own and leaves the
	// group's meal as it was. 'everyone' changes it for the whole group, and only
	// the plan's owner (plan.isSharedOwner) may ask for it; anyone else gets a 403.
	// Left out, the server picks: everyone for the owner, me for other members.
	// scope doesn't matter for a meal that isn't shared.
	async swapMeal(mealId: string, scope?: 'everyone' | 'me') {
		if (!API_URL) throw new Error('Recommendation API URL is not defined');

		const query = scope ? `?scope=${scope}` : '';
		const response = await fetchWithAuth(`${API_URL}/diet-plans/meals/${mealId}/swap${query}`, {
			method: 'PATCH',
		});

		if (!response.ok) {
			throw await ApiError.fromResponse(response, t('dietPlan.meal.swapFailed'));
		}

		return response.json();
	},

  async addExtraMeal(dayOfWeek: number, meal: MealEntry) {
    if (!API_URL) throw new Error('Recommendation API URL is not defined');

    const response = await fetchWithAuth(`${API_URL}/diet-plans/active/meals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayOfWeek,
        ...meal,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to add extra meal');
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
      disclaimer: getAiGuidanceNotice(),
    };
  },
};