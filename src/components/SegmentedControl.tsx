import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected ? styles.optionSelected : undefined]}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : undefined]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.xs,
  },
  option: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  optionSelected: {
    backgroundColor: theme.colors.primary,
  },
  label: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  labelSelected: {
    color: theme.colors.background,
  },
});
