import { Ionicons } from '@expo/vector-icons';

import { OnboardingDraft, OnboardingPageId } from '../../types/models';

export type OnboardingIcon = keyof typeof Ionicons.glyphMap;

export interface OnboardingFieldOption {
  label: string;
  value: string;
  // Shown on option cards only.
  description?: string;
  icon?: OnboardingIcon;
}

interface OnboardingFieldBase {
  id: keyof OnboardingDraft;
  label: string;
  required?: boolean;
  helperText?: string;
  // Two half-width fields in a row share it.
  half?: boolean;
  // Whether the field shows for these answers. A hidden field is never missing.
  visible?: (draft: OnboardingDraft) => boolean;
}

export interface OnboardingInputFieldDefinition extends OnboardingFieldBase {
  inputType: 'text' | 'number';
  placeholder?: string;
  multiline?: boolean;
  // Shown inside the input, after the value.
  unit?: string;
}

export interface OnboardingSelectFieldDefinition extends OnboardingFieldBase {
  inputType: 'single-select' | 'multi-select';
  options: OnboardingFieldOption[];
  // Cards suit a few options that need explaining; chips suit short labels.
  presentation?: 'cards' | 'chips';
  // How picking an option changes a multi-select, when it isn't simply added or removed.
  toggle?: (selected: string[], value: string) => string[];
}

export interface OnboardingFoodSelectionFieldDefinition extends OnboardingFieldBase {
  inputType: 'food-selection';
  placeholder?: string;
}

export interface OnboardingFileUploadFieldDefinition extends OnboardingFieldBase {
  inputType: 'file-upload';
}

export type OnboardingFieldDefinition =
  | OnboardingInputFieldDefinition
  | OnboardingSelectFieldDefinition
  | OnboardingFileUploadFieldDefinition
  | OnboardingFoodSelectionFieldDefinition;

export interface OnboardingPageDefinition {
  id: OnboardingPageId;
  icon: OnboardingIcon;
  title: string;
  subtitle: string;
  // A note under the fields, for anything the user should know about the step.
  hint?: string;
  primaryActionLabel?: string;
  fields: OnboardingFieldDefinition[];
  // Why the answers on the page contradict each other, or null. The message shows
  // under the fields as soon as it applies, and stops the page being submitted.
  validate?: (draft: OnboardingDraft) => string | null;
}
