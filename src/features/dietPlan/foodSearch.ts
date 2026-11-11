import { FoodResponse, MealEntry } from '../../types/models';

// How well a name matches: 0 when it starts with the query, 1 when a word in
// it does, 2 for any other match, or null for none.
function matchRank(name: string, q: string) {
  const lower = name.toLowerCase();
  const index = lower.indexOf(q);
  if (index === -1) return null;
  if (index === 0) return 0;
  return /[\s(,-]/.test(lower[index - 1]) ? 1 : 2;
}

// Names starting with the query come first, then names with a word starting
// with it, then any other match. Shorter names win ties, so "Apple" comes
// before "Apple pie". Foods are named in the app's language, and the English
// name matches too, so "chicken" still finds "Tavuk".
export function searchFoods(foods: FoodResponse[], query: string, limit: number) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const matches: { food: FoodResponse; rank: number }[] = [];
  for (const food of foods) {
    const ranks = [matchRank(food.name, q), food.english_name ? matchRank(food.english_name, q) : null]
      .filter((rank): rank is number => rank !== null);
    if (ranks.length === 0) continue;
    matches.push({ food, rank: Math.min(...ranks) });
  }

  return matches
    .sort((a, b) => a.rank - b.rank || a.food.name.length - b.food.name.length || a.food.name.localeCompare(b.food.name))
    .slice(0, limit)
    .map((match) => match.food);
}

const roundOne = (value: number) => Math.round(value * 10) / 10;

// A food's values are per portion_size grams, so scale them to what was eaten.
// Calories are whole numbers, as the server stores them.
export function foodToMealEntry(food: FoodResponse, grams: number, mealType: string): MealEntry {
  const factor = grams / (food.portion_size || 100);
  return {
    mealType,
    name: `${food.name} (${grams} g)`,
    calories: Math.round(food.kcal * factor),
    proteinG: roundOne(food.protein * factor),
    carbsG: roundOne(food.carbs * factor),
    fatG: roundOne(food.fats * factor),
  };
}
