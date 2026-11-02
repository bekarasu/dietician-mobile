import { OnboardingDraft } from '../../types/models';

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
