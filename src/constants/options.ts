import { translatedOption as option } from '../i18n';
import { DietaryPreference, GoalType, SpecialProgram } from '../types/models';

export const GOAL_TYPE_OPTIONS: Array<{ label: string; value: GoalType }> = [
  option('weight_loss', 'options.goal.weight_loss'),
  option('maintenance', 'options.goal.maintenance'),
  option('body_recomposition', 'options.goal.body_recomposition'),
  option('habit_building', 'options.goal.habit_building'),
];

export const DIETARY_OPTIONS: Array<{ label: string; value: DietaryPreference }> = [
  option('omnivore', 'options.diet.omnivore'),
  option('vegetarian', 'options.diet.vegetarian'),
  option('vegan', 'options.diet.vegan'),
  option('pescatarian', 'options.diet.pescatarian'),
  option('gluten_free', 'options.diet.gluten_free'),
  option('dairy_free', 'options.diet.dairy_free'),
];

// Offered only where they apply (pregnancy unless the sex is male), so they
// stay out of everyone else's way. The server keeps no program, only the
// pregnancy week, as a due date.
export const SPECIAL_PROGRAM_OPTIONS: Array<{ label: string; value: SpecialProgram }> = [option('pregnancy', 'options.specialProgram.pregnancy')];

export const GENDER_OPTIONS: Array<{ label: string; value: string }> = [
  option('male', 'options.gender.male'),
  option('female', 'options.gender.female'),
  option('other', 'options.gender.other'),
];

export const ACTIVITY_LEVEL_OPTIONS: Array<{ label: string; value: string }> = [
  option('sedentary', 'options.activity.sedentary'),
  option('lightly_active', 'options.activity.lightly_active'),
  option('moderately_active', 'options.activity.moderately_active'),
  option('very_active', 'options.activity.very_active'),
  option('extra_active', 'options.activity.extra_active'),
];

export const INVENTORY_CATEGORIES = ['Produce', 'Protein', 'Dairy', 'Frozen', 'Pantry', 'Snacks'];