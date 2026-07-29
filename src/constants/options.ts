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

export const GENDER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

export const ACTIVITY_LEVEL_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Sedentary', value: 'sedentary' },
  { label: 'Lightly Active', value: 'lightly_active' },
  { label: 'Moderately Active', value: 'moderately_active' },
  { label: 'Very Active', value: 'very_active' },
  { label: 'Extra Active', value: 'extra_active' },
];

export const INVENTORY_CATEGORIES = ['Produce', 'Protein', 'Dairy', 'Frozen', 'Pantry', 'Snacks'];