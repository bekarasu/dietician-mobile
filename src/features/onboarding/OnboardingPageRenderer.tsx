import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppTextInput } from '../../components/AppTextInput';
import { BloodTestUploader } from '../../components/BloodTestUploader';
import { theme } from '../../theme/theme';
import { OnboardingDraft } from '../../types/models';

import {
  OnboardingFieldDefinition,
  OnboardingPageDefinition,
  OnboardingSelectFieldDefinition,
} from './types';

interface OnboardingPageRendererProps {
  page: OnboardingPageDefinition;
  draft: OnboardingDraft;
  showValidation: boolean;
  onChange: (field: keyof OnboardingDraft, value: OnboardingDraft[keyof OnboardingDraft]) => void;
}

function isFieldMissing(field: OnboardingFieldDefinition, draft: OnboardingDraft) {
  if (!field.required) {
    return false;
  }

  const value = draft[field.id];

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return String(value).trim().length === 0;
}

export function OnboardingPageRenderer({ page, draft, showValidation, onChange }: OnboardingPageRendererProps) {
  return (
    <View style={styles.container}>
      {page.fields.map((field) => {
        const rawValue = draft[field.id];
        console.log({ draft })
        const hasError = showValidation && isFieldMissing(field, draft);

        if (field.inputType === 'text' || field.inputType === 'number') {
          return (
            <AppTextInput
              key={String(field.id)}
              keyboardType={field.inputType === 'number' ? 'numeric' : 'default'}
              label={field.label}
              multiline={field.multiline}
              onChangeText={(text) => onChange(field.id, text)}
              placeholder={field.placeholder}
              value={Array.isArray(rawValue) ? '' : String(rawValue ?? '')}
              error={hasError ? `${field.label} is required.` : undefined}
            />
          );
        }

        if (field.inputType === 'file-upload') {
          return (
            <View key={String(field.id)} style={styles.selectionGroup}>
              <Text style={styles.selectionLabel}>{field.label}</Text>
              {field.helperText ? <Text style={styles.helperText}>{field.helperText}</Text> : null}
              <BloodTestUploader onUploadComplete={() => onChange(field.id, true as OnboardingDraft[keyof OnboardingDraft])} />
              {hasError ? <Text style={styles.errorText}>{field.label} is required.</Text> : null}
            </View>
          );
        }

        const selectedValues: string[] = Array.isArray(rawValue) ? rawValue : [];
        const selectField = field as OnboardingSelectFieldDefinition;

        return (
          <View key={String(field.id)} style={styles.selectionGroup}>
            <Text style={styles.selectionLabel}>{field.label}</Text>
            {field.helperText ? <Text style={styles.helperText}>{field.helperText}</Text> : null}
            <View style={styles.optionGrid}>
              {selectField.options.map((option) => {
                const isSelected =
                  field.inputType === 'single-select'
                    ? rawValue === option.value
                    : selectedValues.includes(option.value);

                return (
                  <AppButton
                    key={option.value}
                    onPress={() => {
                      if (field.inputType === 'single-select') {
                        onChange(field.id, option.value as OnboardingDraft[keyof OnboardingDraft]);
                        return;
                      }

                      const nextValues = isSelected
                        ? selectedValues.filter((value) => value !== option.value)
                        : [...selectedValues, option.value];

                      onChange(field.id, nextValues as OnboardingDraft[keyof OnboardingDraft]);
                    }}
                    style={styles.optionButton}
                    title={option.label}
                    variant={isSelected ? 'primary' : 'secondary'}
                  />
                );
              })}
            </View>
            {hasError ? <Text style={styles.errorText}>{field.label} is required.</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.md,
  },
  selectionGroup: {
    gap: theme.spacing.sm,
  },
  selectionLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  helperText: {
    color: theme.colors.muted,
    lineHeight: 20,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionButton: {
    minWidth: '47%',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.caption.fontSize,
  },
});