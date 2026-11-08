import { ACTIVITY_LEVEL_OPTIONS, DIETARY_OPTIONS, GENDER_OPTIONS, GOAL_TYPE_OPTIONS, SPECIAL_PROGRAM_OPTIONS } from '../../constants/options';
import {
  canHavePregnancyPlan,
  getDietError,
  getPregnancyGoalError,
  getPregnancyWeekError,
  getTargetWeightError,
  toggleDietaryPreference,
} from '../profile/profileRules';

import { OnboardingFieldOption, OnboardingIcon, OnboardingPageDefinition } from './types';
import { isPregnantDraft } from './validation';

const ACTIVITY_DESCRIPTIONS: Record<string, string> = {
  sedentary: 'Little or no exercise',
  lightly_active: 'Light exercise 1–3 days a week',
  moderately_active: 'Moderate exercise 3–5 days a week',
  very_active: 'Hard exercise 6–7 days a week',
  extra_active: 'Very hard exercise and a physical job',
};

const GOAL_DETAILS: Record<string, { description: string; icon: OnboardingIcon }> = {
  weight_loss: { description: 'Lose weight at a steady, safe pace', icon: 'trending-down-outline' },
  maintenance: { description: 'Keep your weight where it is', icon: 'swap-horizontal-outline' },
  body_recomposition: { description: 'Build muscle while losing fat', icon: 'barbell-outline' },
  habit_building: { description: 'Eat better, without a weight target', icon: 'leaf-outline' },
};

const activityOptions: OnboardingFieldOption[] = ACTIVITY_LEVEL_OPTIONS.map((option) => ({
  ...option,
  description: ACTIVITY_DESCRIPTIONS[option.value],
}));

const goalOptions: OnboardingFieldOption[] = GOAL_TYPE_OPTIONS.map((option) => ({ ...option, ...GOAL_DETAILS[option.value] }));

// Add or remove pages by editing this array. The renderer and navigation logic read from this config only.
// The last page saves the profile, whichever it is.
export const ONBOARDING_PAGES: OnboardingPageDefinition[] = [
  {
    id: 'basics',
    icon: 'person-outline',
    title: 'A little about you',
    subtitle: 'This sets how much energy you use in a day, so your portions fit you.',
    fields: [
      { id: 'age', label: 'Age', inputType: 'number', required: true, placeholder: '25', unit: 'years', half: true },
      { id: 'heightCm', label: 'Height', inputType: 'number', required: true, placeholder: '175', unit: 'cm', half: true },
      { id: 'gender', label: 'Sex', inputType: 'single-select', required: true, options: GENDER_OPTIONS },
      // Right under the sex it depends on, and only for those it applies to, so
      // it's easy to find without being part of everyone's setup.
      {
        id: 'specialPrograms',
        label: 'Special program',
        inputType: 'multi-select',
        helperText: 'Optional. Expecting? Your plan adds the energy each trimester needs and leaves out foods to avoid in pregnancy.',
        options: SPECIAL_PROGRAM_OPTIONS,
        visible: (draft) => canHavePregnancyPlan(draft.gender),
      },
      {
        id: 'pregnancyWeek',
        label: 'Weeks pregnant',
        inputType: 'number',
        required: true,
        placeholder: '20',
        unit: 'weeks',
        visible: isPregnantDraft,
      },
      {
        id: 'activityLevel',
        label: 'How active are you?',
        inputType: 'single-select',
        required: true,
        options: activityOptions,
        presentation: 'cards',
      },
    ],
    // An empty week is the field's own error, shown on Continue.
    validate: (draft) => (isPregnantDraft(draft) && draft.pregnancyWeek.trim() ? getPregnancyWeekError(draft.pregnancyWeek) : null),
  },
  {
    id: 'goals',
    icon: 'flag-outline',
    title: 'What are you working towards?',
    subtitle: 'Your plan paces you safely towards it.',
    // The goal comes first, so the time estimate under the weights is the last thing on the page.
    fields: [
      { id: 'goalType', label: 'Your goal', inputType: 'single-select', required: true, options: goalOptions, presentation: 'cards' },
      { id: 'weightKg', label: 'Current weight', inputType: 'number', required: true, placeholder: '84', unit: 'kg', half: true },
      { id: 'targetWeightKg', label: 'Target weight', inputType: 'number', required: true, placeholder: '78', unit: 'kg', half: true },
    ],
    validate: (draft) =>
      getPregnancyGoalError(isPregnantDraft(draft), draft.goalType) ??
      getTargetWeightError(draft.goalType, Number(draft.weightKg), Number(draft.targetWeightKg), Number(draft.heightCm)),
  },
  {
    id: 'preferences',
    icon: 'leaf-outline',
    title: 'How do you like to eat?',
    subtitle: 'Every meal in your plan respects these. You can change them later in your profile.',
    fields: [
      {
        id: 'dietaryPreferences',
        label: 'Diet',
        inputType: 'multi-select',
        helperText: 'Choose one of omnivore, vegetarian, vegan or pescatarian. Gluten free and dairy free go with any of them.',
        options: DIETARY_OPTIONS,
        toggle: toggleDietaryPreference,
      },
      { id: 'dislikedFoods', label: 'Foods you don\'t like', inputType: 'food-selection', placeholder: 'Choose foods to leave out' },
      { id: 'allergies', label: 'Allergies', inputType: 'food-selection', placeholder: 'Choose any allergies' },
    ],
    // Restarting onboarding fills the diet from the profile, which can hold two from before the rule.
    validate: (draft) => getDietError(draft.dietaryPreferences),
  },
  {
    id: 'blood-test',
    icon: 'document-text-outline',
    title: 'Add a recent blood test',
    subtitle: 'Optional. Your results help tailor your meals further.',
    hint: 'Your daily water target and coffee limit are set for you from your weight and age.',
    primaryActionLabel: 'Finish',
    fields: [{ id: 'bloodTestUploaded', label: 'Blood test results', inputType: 'file-upload', required: false }],
  },
];
