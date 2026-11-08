import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Fragment, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppTextInput } from '../../components/AppTextInput';
import { BloodTestUploader } from '../../components/BloodTestUploader';
import { ChoiceChips } from '../../components/ChoiceChips';
import { CountryPicker } from '../../components/CountryPicker';
import { FoodPickerRow } from '../../components/FoodPickerRow';
import { OnboardingStackParamList } from '../../navigation/navigationTypes';
import { theme } from '../../theme/theme';
import { OnboardingDraft } from '../../types/models';

import { OnboardingFieldDefinition, OnboardingFieldOption, OnboardingPageDefinition, OnboardingSelectFieldDefinition } from './types';
import { isFieldMissing, isFieldVisible } from './validation';

interface OnboardingPageRendererProps {
  page: OnboardingPageDefinition;
  draft: OnboardingDraft;
  showValidation: boolean;
  onChange: (field: keyof OnboardingDraft, value: OnboardingDraft[keyof OnboardingDraft]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  onBloodTestUploaded?: (uploadId: string) => void;
}

type DraftValue = OnboardingDraft[keyof OnboardingDraft];

function FieldLabel({ label, helperText }: { label: string; helperText?: string }) {
  return (
    <View style={styles.labelBlock}>
      <Text style={styles.label}>{label}</Text>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

function OptionCards({ options, isSelected, onPress }: { options: OnboardingFieldOption[]; isSelected: (value: string) => boolean; onPress: (value: string) => void }) {
  return (
    <View style={styles.cards}>
      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onPress(option.value)}
            style={({ pressed }) => [styles.optionCard, selected && styles.optionCardSelected, pressed && styles.pressed]}
          >
            {option.icon ? (
              <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                <Ionicons name={option.icon} size={20} color={selected ? theme.colors.surface : theme.colors.primary} />
              </View>
            ) : null}
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              {option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}
            </View>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function OnboardingPageRenderer({ page, draft, showValidation, onChange, onUploadingChange, onBloodTestUploaded }: OnboardingPageRendererProps) {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList>>();

  const renderField = (field: OnboardingFieldDefinition): ReactNode => {
    const rawValue = draft[field.id];
    const error = showValidation && isFieldMissing(field, draft) ? `Add your ${field.label.toLowerCase()} to continue.` : null;

    if (field.inputType === 'text' || field.inputType === 'number') {
      return (
        <AppTextInput
          inputMode={field.inputType === 'number' ? 'decimal' : 'text'}
          label={field.label}
          multiline={field.multiline}
          onChangeText={(text) => onChange(field.id, text)}
          placeholder={field.placeholder}
          suffix={field.unit}
          value={Array.isArray(rawValue) ? '' : String(rawValue ?? '')}
          error={error ?? undefined}
        />
      );
    }

    if (field.inputType === 'file-upload') {
      return (
        <View style={styles.field}>
          <FieldLabel label={field.label} helperText={field.helperText} />
          <View style={styles.uploadCard}>
            <Ionicons name="cloud-upload-outline" size={28} color={theme.colors.primary} />
            <Text style={styles.uploadText}>A PDF or a photo of your lab report</Text>
            <BloodTestUploader
              onUploadComplete={(upload) => {
                onChange(field.id, true as DraftValue);
                onBloodTestUploaded?.(upload.id);
              }}
              onUploadStateChange={onUploadingChange}
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      );
    }

    if (field.inputType === 'food-selection') {
      const selectedFoods = String(rawValue || '').split(',').map((food) => food.trim()).filter(Boolean);
      return (
        <View style={styles.field}>
          <FieldLabel label={field.label} helperText={field.helperText} />
          <FoodPickerRow
            foods={selectedFoods}
            placeholder={field.placeholder || 'Choose foods'}
            onPress={() => navigation.navigate('FoodSelection', { selectedFoods, fieldName: field.id, context: 'onboarding' })}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      );
    }

    if (field.inputType === 'country') {
      return (
        <View style={styles.field}>
          <FieldLabel label={field.label} helperText={field.helperText} />
          <CountryPicker
            value={typeof rawValue === 'string' ? rawValue : ''}
            placeholder={field.placeholder}
            onChange={(code) => onChange(field.id, code as DraftValue)}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      );
    }

    // Every other kind of field returned above.
    const selectField = field as OnboardingSelectFieldDefinition;
    const selectedValues: string[] = Array.isArray(rawValue) ? rawValue : [];
    const isSelected = (value: string) => (field.inputType === 'single-select' ? rawValue === value : selectedValues.includes(value));
    const select = (value: string) => {
      if (field.inputType === 'single-select') {
        onChange(field.id, value as DraftValue);
        return;
      }
      const nextValues = selectField.toggle
        ? selectField.toggle(selectedValues, value)
        : selectedValues.includes(value)
          ? selectedValues.filter((item) => item !== value)
          : [...selectedValues, value];
      onChange(field.id, nextValues as DraftValue);
    };

    return (
      <View style={styles.field}>
        <FieldLabel label={field.label} helperText={field.helperText} />
        {selectField.presentation === 'cards' ? (
          <OptionCards options={selectField.options} isSelected={isSelected} onPress={select} />
        ) : (
          <ChoiceChips options={selectField.options} isSelected={isSelected} onPress={select} />
        )}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  };

  // Consecutive half-width fields share a row.
  const rows: OnboardingFieldDefinition[][] = [];
  page.fields.filter((field) => isFieldVisible(field, draft)).forEach((field) => {
    const last = rows[rows.length - 1];
    if (field.half && last?.length === 1 && last[0].half) {
      last.push(field);
    } else {
      rows.push([field]);
    }
  });

  return (
    <View style={styles.container}>
      {rows.map((row) =>
        row.length > 1 ? (
          <View key={row.map((field) => String(field.id)).join('-')} style={styles.row}>
            {row.map((field) => (
              <View key={String(field.id)} style={styles.half}>
                {renderField(field)}
              </View>
            ))}
          </View>
        ) : (
          <Fragment key={String(row[0].id)}>{renderField(row[0])}</Fragment>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  half: {
    flex: 1,
  },
  field: {
    gap: theme.spacing.sm,
  },
  labelBlock: {
    gap: 2,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  helperText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.caption.fontSize,
  },
  pressed: {
    opacity: 0.8,
  },
  cards: {
    gap: theme.spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  optionCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  optionIconSelected: {
    backgroundColor: theme.colors.primary,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  optionDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  uploadCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  uploadText: {
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
