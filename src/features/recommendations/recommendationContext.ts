import { RecommendationInput } from '../../types/models';
import { formatGoalType } from '../../utils/formatters';

export function buildRecommendationNarrative(input: RecommendationInput) {
  const lastLog = input.dailyLogs[0];
  const availableIngredients = input.inventory.slice(0, 3).map((item) => item.productName.toLowerCase());

  return {
    goalSummary: `Goal focus: ${formatGoalType(input.goalType)}`,
    inventorySummary:
      availableIngredients.length > 0
        ? `Priority ingredients: ${availableIngredients.join(', ')}`
        : 'Priority ingredients: build a recommendation around shelf-stable basics.',
    behaviorSummary: lastLog
      ? `Recent recovery signal: ${lastLog.foodName} (${lastLog.estimatedCalories} kcal)`
      : 'Recent recovery signal: no over-consumption log today.',
  };
}