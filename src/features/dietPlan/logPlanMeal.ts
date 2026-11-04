import { progressService } from '../../services/progressService';
import { recommendationService } from '../../services/recommendationService';
import { DietMeal } from '../../types/models';

// Logs a plan meal as eaten: first the daily log, which scores read, then the
// plan's taken flag. progressService returns null instead of throwing, so a
// failed log stops here rather than marking a meal taken that never counted.
export async function logPlanMeal(meal: DietMeal, logDate: string) {
  const log = await progressService.upsertDailyLog({
    logDate,
    meals: [{
      mealType: meal.mealType,
      name: meal.name,
      calories: meal.calories,
      proteinG: meal.proteinG,
      carbsG: meal.carbsG,
      fatG: meal.fatG,
    }],
  });
  if (!log) {
    throw new Error('Failed to log meal.');
  }
  await recommendationService.markMealAsTaken(meal.id);
}
