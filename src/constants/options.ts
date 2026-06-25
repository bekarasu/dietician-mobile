import { DietaryPreference, GoalType } from '../types/models';

export const GOAL_TYPE_OPTIONS: Array<{ label: string; value: GoalType }> = [
  { label: 'Weight loss', value: 'weight_loss' },
  { label: 'Healthy maintenance', value: 'maintenance' },
  { label: 'Body recomposition', value: 'body_recomposition' },
  { label: 'Habit building', value: 'habit_building' },
];

export const DIETARY_OPTIONS: Array<{ label: string; value: DietaryPreference }> = [
  { label: 'Omnivore', value: 'omnivore' },
  { label: 'Vegetarian', value: 'vegetarian' },
  { label: 'Vegan', value: 'vegan' },
  { label: 'Pescatarian', value: 'pescatarian' },
  { label: 'Gluten free', value: 'gluten_free' },
  { label: 'Dairy free', value: 'dairy_free' },
];

export const INVENTORY_CATEGORIES = ['Produce', 'Protein', 'Dairy', 'Frozen', 'Pantry', 'Snacks'];