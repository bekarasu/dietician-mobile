import { FoodResponse, MealEntry } from '../../types/models';

// Names starting with the query come first, then names with a word starting
// with it, then any other match. Shorter names win ties, so "Apple" comes
// before "Apple pie".
export function searchFoods(foods: FoodResponse[], query: string, limit: number) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const matches: { food: FoodResponse; rank: number }[] = [];
  for (const food of foods) {
    const name = food.name.toLowerCase();
    const index = name.indexOf(q);
    if (index === -1) continue;
    let rank = 2;
    if (index === 0) {
      rank = 0;
    } else if (/[\s(,-]/.test(name[index - 1])) {
      rank = 1;
    }
    matches.push({ food, rank });
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
