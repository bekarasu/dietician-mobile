import { ACTIVITY_LEVEL_OPTIONS, DIETARY_OPTIONS, GENDER_OPTIONS, GOAL_TYPE_OPTIONS, SPECIAL_PROGRAM_OPTIONS } from '../../constants/options';
import {
  canHavePregnancyPlan,
  getDietError,
  getPregnancyGoalError,
  getPregnancyWeekError,
  getTargetWeightError,
  toggleDietaryPreference,
} from '../profile/profileRules';

import { memoizeForLanguage, t, TranslationKey } from '../../i18n';

import { OnboardingFieldOption, OnboardingIcon, OnboardingPageDefinition } from './types';
import { isPregnantDraft } from './validation';

const ACTIVITY_DESCRIPTIONS: Record<string, TranslationKey> = {
  sedentary: 'onboarding.pages.activity.sedentary',
  lightly_active: 'onboarding.pages.activity.lightly_active',
  moderately_active: 'onboarding.pages.activity.moderately_active',
  very_active: 'onboarding.pages.activity.very_active',
  extra_active: 'onboarding.pages.activity.extra_active',
};

const GOAL_DETAILS: Record<string, { descriptionKey: TranslationKey; icon: OnboardingIcon }> = {
  weight_loss: { descriptionKey: 'onboarding.pages.goal.weight_loss', icon: 'trending-down-outline' },
  maintenance: { descriptionKey: 'onboarding.pages.goal.maintenance', icon: 'swap-horizontal-outline' },
  body_recomposition: { descriptionKey: 'onboarding.pages.goal.body_recomposition', icon: 'barbell-outline' },
  habit_building: { descriptionKey: 'onboarding.pages.goal.habit_building', icon: 'leaf-outline' },
};

// Add or remove pages by editing this list. The renderer and navigation logic read from this config only.
// The last page saves the profile, whichever it is. Built in the current language when first read after a
// language change, so keep texts as t() calls inside it.
export const getOnboardingPages = memoizeForLanguage((): OnboardingPageDefinition[] => {
  const activityOptions: OnboardingFieldOption[] = ACTIVITY_LEVEL_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    description: t(ACTIVITY_DESCRIPTIONS[option.value]),
  }));

  const goalOptions: OnboardingFieldOption[] = GOAL_TYPE_OPTIONS.map((option) => ({
    value: option.value,
    label: option.label,
    description: t(GOAL_DETAILS[option.value].descriptionKey),
    icon: GOAL_DETAILS[option.value].icon,
  }));

  return [
    {
      id: 'basics',
      icon: 'person-outline',
      title: t('onboarding.pages.basics.title'),
      subtitle: t('onboarding.pages.basics.subtitle'),
      fields: [
        { id: 'age', label: t('onboarding.pages.basics.age'), inputType: 'number', required: true, placeholder: '25', unit: t('onboarding.pages.basics.ageUnit'), half: true },
        { id: 'heightCm', label: t('onboarding.pages.basics.height'), inputType: 'number', required: true, placeholder: '175', unit: 'cm', half: true },
        { id: 'gender', label: t('onboarding.pages.basics.sex'), inputType: 'single-select', required: true, options: GENDER_OPTIONS },
        // Right under the sex it depends on, and only for those it applies to, so
        // it's easy to find without being part of everyone's setup.
        {
          id: 'specialPrograms',
          label: t('onboarding.pages.basics.specialProgram'),
          inputType: 'multi-select',
          helperText: t('onboarding.pages.basics.specialProgramHelp'),
          options: SPECIAL_PROGRAM_OPTIONS,
          visible: (draft) => canHavePregnancyPlan(draft.gender),
        },
        {
          id: 'pregnancyWeek',
          label: t('onboarding.pages.basics.pregnancyWeek'),
          inputType: 'number',
          required: true,
          placeholder: '20',
          unit: t('onboarding.pages.basics.pregnancyWeekUnit'),
          visible: isPregnantDraft,
        },
        {
          id: 'activityLevel',
          label: t('onboarding.pages.basics.activity'),
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
      title: t('onboarding.pages.goals.title'),
      subtitle: t('onboarding.pages.goals.subtitle'),
      // The goal comes first, so the time estimate under the weights is the last thing on the page.
      fields: [
        { id: 'goalType', label: t('onboarding.pages.goals.goal'), inputType: 'single-select', required: true, options: goalOptions, presentation: 'cards' },
        { id: 'weightKg', label: t('onboarding.pages.goals.weight'), inputType: 'number', required: true, placeholder: '84', unit: 'kg', half: true },
        { id: 'targetWeightKg', label: t('onboarding.pages.goals.target'), inputType: 'number', required: true, placeholder: '78', unit: 'kg', half: true },
      ],
      validate: (draft) =>
        getPregnancyGoalError(isPregnantDraft(draft), draft.goalType) ??
        getTargetWeightError(draft.goalType, Number(draft.weightKg), Number(draft.targetWeightKg), Number(draft.heightCm)),
    },
    {
      id: 'preferences',
      icon: 'leaf-outline',
      title: t('onboarding.pages.preferences.title'),
      subtitle: t('onboarding.pages.preferences.subtitle'),
      fields: [
        {
          id: 'countryCode',
          label: t('onboarding.pages.preferences.country'),
          inputType: 'country',
          placeholder: t('components.countryPicker.placeholder'),
          helperText: t('onboarding.pages.preferences.countryHelp'),
        },
        {
          id: 'dietaryPreferences',
          label: t('onboarding.pages.preferences.diet'),
          inputType: 'multi-select',
          helperText: t('onboarding.pages.preferences.dietHelp'),
          options: DIETARY_OPTIONS,
          toggle: toggleDietaryPreference,
        },
        { id: 'dislikedFoods', label: t('onboarding.pages.preferences.disliked'), inputType: 'food-selection', placeholder: t('onboarding.pages.preferences.dislikedPlaceholder') },
        { id: 'allergies', label: t('onboarding.pages.preferences.allergies'), inputType: 'food-selection', placeholder: t('onboarding.pages.preferences.allergiesPlaceholder') },
      ],
      // Restarting onboarding fills the diet from the profile, which can hold two from before the rule.
      validate: (draft) => getDietError(draft.dietaryPreferences),
    },
    {
      id: 'blood-test',
      icon: 'document-text-outline',
      title: t('onboarding.pages.bloodTest.title'),
      subtitle: t('onboarding.pages.bloodTest.subtitle'),
      hint: t('onboarding.pages.bloodTest.hint'),
      primaryActionLabel: t('onboarding.pages.bloodTest.finish'),
      fields: [{ id: 'bloodTestUploaded', label: t('onboarding.pages.bloodTest.results'), inputType: 'file-upload', required: false }],
    },
  ];
});
