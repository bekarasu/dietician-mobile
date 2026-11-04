import { GoalType } from '../../types/models';
import { formatKg } from '../../utils/formatters';

// Rules that answers each fine on their own must also meet together. Onboarding
// and the profile screen use them, and account-service refuses the same things
// (internal/profile/model/rules.go), so keep both in step.

// Base diets say which animal foods someone eats, so only one can apply. Gluten
// free and dairy free combine with any of them.
export const BASE_DIETS: readonly string[] = ['omnivore', 'vegetarian', 'vegan', 'pescatarian'];

// The lowest BMI a weight-loss target may have, the same limit scoring uses.
export const MIN_HEALTHY_BMI = 18.5;

// Picking a base diet replaces the one picked before; anything else is added
// or removed on its own.
export function toggleDietaryPreference<T extends string>(current: T[], value: T): T[] {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  const kept = BASE_DIETS.includes(value) ? current.filter((item) => !BASE_DIETS.includes(item)) : current;
  return [...kept, value];
}

// Only reachable with diets saved before the rule, since picking one replaces the other.
export function getDietError(preferences: string[]) {
  return preferences.filter((item) => BASE_DIETS.includes(item)).length > 1
    ? 'Choose only one of omnivore, vegetarian, vegan or pescatarian.'
    : null;
}

// Why a weight-loss target can't be used, or null. Other goals don't move weight
// in one direction, so any target suits them. Numbers not entered yet pass.
export function getTargetWeightError(goalType: GoalType | string, weightKg: number, targetKg: number, heightCm: number) {
  if (goalType !== 'weight_loss' || !(targetKg > 0)) {
    return null;
  }
  if (weightKg > 0 && targetKg >= weightKg) {
    return `For weight loss, choose a target below your current weight of ${formatKg(weightKg)}.`;
  }
  if (heightCm > 0) {
    // Rounded up, so the weight shown is itself allowed.
    const minKg = Math.ceil(MIN_HEALTHY_BMI * (heightCm / 100) ** 2 * 10) / 10;
    if (targetKg < minKg) {
      return `That's below the healthy range for your height. Choose at least ${formatKg(minKg)}.`;
    }
  }
  return null;
}
