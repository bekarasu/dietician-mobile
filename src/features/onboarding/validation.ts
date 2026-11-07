import { OnboardingDraft, UserProfile } from '../../types/models';

import { OnboardingFieldDefinition } from './types';

export function isFieldMissing(field: OnboardingFieldDefinition, draft: OnboardingDraft) {
  if (!field.required) {
    return false;
  }

  const value = draft[field.id];

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (field.inputType === 'number' && Number.isNaN(Number(value))) {
    return true;
  }

  return String(value ?? '').trim().length === 0;
}

// Onboarding is complete once the profile has the answers a plan is built from.
// That isn't stored anywhere, so it's worked out from the profile each time.
export function isOnboardingComplete(profile: UserProfile | null) {
  return Boolean(profile?.heightCm && profile.weightKg && profile.goalType);
}
