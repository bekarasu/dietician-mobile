import { ACTIVITY_LEVEL_OPTIONS, DIETARY_OPTIONS, GENDER_OPTIONS, GOAL_TYPE_OPTIONS } from '../../constants/options';

import { OnboardingPageDefinition } from './types';

// Add or remove pages by editing this array. The renderer and navigation logic read from this config only.
export const ONBOARDING_PAGES: OnboardingPageDefinition[] = [
  {
    id: 'basics',
    title: 'Start with the essentials',
    subtitle: 'Capture the minimum profile data needed to personalize guidance without forcing a long form up front.',
    requestSummary: 'This step can sync account basics or validate required fields with a backend.',
    fields: [
      {
        id: 'name',
        label: 'Name',
        inputType: 'text',
        required: true,
        placeholder: 'How should the app address you?',
      },
      {
        id: 'age',
        label: 'Age',
        inputType: 'number',
        required: true,
        placeholder: '31',
      },
      {
        id: 'heightCm',
        label: 'Height (cm)',
        inputType: 'number',
        required: true,
        placeholder: '180',
      },
      {
        id: 'gender',
        label: 'Biological gender',
        inputType: 'single-select',
        required: true,
        options: GENDER_OPTIONS,
      },
      {
        id: 'activityLevel',
        label: 'Activity level',
        inputType: 'single-select',
        required: true,
        options: ACTIVITY_LEVEL_OPTIONS,
      },
    ],
  },
  {
    id: 'goals',
    title: 'Define your goal',
    subtitle: 'This step shapes recommendation tone, calorie planning, and progress framing.',
    requestSummary: 'A backend or AI service can use this step to suggest an initial calorie target or coaching direction.',
    fields: [
      {
        id: 'weightKg',
        label: 'Current weight (kg)',
        inputType: 'number',
        required: true,
        placeholder: '84',
      },
      {
        id: 'targetWeightKg',
        label: 'Target weight (kg)',
        inputType: 'number',
        required: true,
        placeholder: '78',
      },
      {
        id: 'goalType',
        label: 'Goal type',
        inputType: 'single-select',
        required: true,
        options: GOAL_TYPE_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      },
    ],
  },
  {
    id: 'preferences',
    title: 'Set food preferences',
    subtitle: 'Keep this lightweight so recommendations can start useful, then deepen later inside profile settings.',
    requestSummary: 'This step is where recommendation filters or contraindication checks can be synced to a backend.',
    fields: [
      {
        id: 'dietaryPreferences',
        label: 'Dietary preferences',
        inputType: 'multi-select',
        helperText: 'Select every preference that should influence meal generation.',
        options: DIETARY_OPTIONS.map((option) => ({
          label: option.label,
          value: option.value,
        })),
      },
      {
        id: 'dislikedFoods',
        label: 'Disliked foods',
        inputType: 'text',
        placeholder: 'mushrooms, liver, olives',
      },
      {
        id: 'allergies',
        label: 'Allergies',
        inputType: 'text',
        placeholder: 'peanuts, shellfish',
      },
      {
        id: 'dailyCalorieTarget',
        label: 'Daily calorie target',
        inputType: 'number',
        placeholder: 'Leave blank to accept a suggested target',
      },
    ],
  },
  {
    id: 'habits',
    title: 'Add habit targets',
    subtitle: 'Hydration and coffee targets become immediately available in the dashboard after onboarding.',
    requestSummary: 'This step can sync reminder preferences, hydration goals, or coaching nudges.',
    primaryActionLabel: 'Finish onboarding',
    fields: [
      {
        id: 'targetWaterMl',
        label: 'Daily water target (ml)',
        inputType: 'number',
        required: true,
        placeholder: '2500',
      },
      {
        id: 'targetCoffeeCups',
        label: 'Daily coffee cap (cups)',
        inputType: 'number',
        required: true,
        placeholder: '3',
      },
    ],
  },
];