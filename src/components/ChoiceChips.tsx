import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

interface ChoiceChipsProps {
  options: { label: string; value: string }[];
  isSelected: (value: string) => boolean;
  onPress: (value: string) => void;
  disabled?: boolean;
}

// Pill toggles for short choices, single or multiple.
export function ChoiceChips({ options, isSelected, onPress, disabled = false }: ChoiceChipsProps) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = isSelected(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onPress(option.value)}
            style={({ pressed }) => [styles.chip, selected && styles.chipSelected, (pressed || disabled) && styles.dimmed]}
          >
            {selected ? <Ionicons name="checkmark" size={16} color={theme.colors.surface} /> : null}
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 42,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: theme.colors.surface,
  },
  dimmed: {
    opacity: 0.7,
  },
});
