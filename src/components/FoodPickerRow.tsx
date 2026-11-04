import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';

interface FoodPickerRowProps {
  foods: string[];
  placeholder: string;
  onPress: () => void;
}

// The chosen foods as chips, opening the food picker when tapped.
export function FoodPickerRow({ foods, placeholder, onPress }: FoodPickerRowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {foods.length ? (
        <View style={styles.chips}>
          {foods.map((food) => (
            <View key={food} style={styles.chip}>
              <Text style={styles.chipText}>{food}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.placeholder}>{placeholder}</Text>
      )}
      <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    opacity: 0.8,
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primarySoft,
  },
  chipText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.typography.caption.fontSize,
  },
  placeholder: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
  },
});
