import { OnboardingDraft, OnboardingPageId } from '../../types/models';

export interface OnboardingFieldOption {
  label: string;
  value: string;
}

interface OnboardingFieldBase {
  id: keyof OnboardingDraft;
  label: string;
  required?: boolean;
  helperText?: string;
  helpAlert?: {
    title: string;
    message: string;
    linkText?: string;
  };
}

export interface OnboardingInputFieldDefinition extends OnboardingFieldBase {
  inputType: 'text' | 'number';
  placeholder?: string;
  multiline?: boolean;
}

export interface OnboardingSelectFieldDefinition extends OnboardingFieldBase {
  inputType: 'single-select' | 'multi-select';
  options: OnboardingFieldOption[];
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
  title: string;
  subtitle: string;
  requestSummary: string;
  primaryActionLabel?: string;
  fields: OnboardingFieldDefinition[];
}