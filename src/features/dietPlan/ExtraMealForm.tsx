import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { AppTextInput } from '../../components/AppTextInput';
import { progressService } from '../../services/progressService';
import { recommendationService } from '../../services/recommendationService';
import { theme } from '../../theme/theme';
import { FoodResponse, MealEntry } from '../../types/models';
import { showDialog } from '../dialog/dialogStore';
import { foodToMealEntry, searchFoods } from './foodSearch';

const MAX_SUGGESTIONS = 5;

type FoodsState = 'idle' | 'loading' | 'ready' | 'failed';

// An empty or unreadable field is left out rather than sent as 0.
function parseAmount(text: string) {
  const value = parseFloat(text);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function getSearchHint(foodsState: FoodsState, query: string, hasSuggestions: boolean) {
  if (foodsState === 'loading') {
    return 'Loading foods…';
  }
  if (foodsState === 'failed') {
    return 'Couldn\'t load the food list. Enter the meal and its calories yourself.';
  }
  if (query.trim().length >= 2 && !hasSuggestions) {
    return 'Not in the list. Enter its calories yourself below.';
  }
  return 'Pick a food to fill in its calories and macros, or enter your own.';
}

function MacroBadges({ meal }: { meal: MealEntry }) {
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroBadge}>
        <Text style={styles.macroText}>{meal.calories} kcal</Text>
      </View>
      <View style={styles.macroBadge}>
        <Text style={styles.macroText}>P: {meal.proteinG}g</Text>
      </View>
      <View style={styles.macroBadge}>
        <Text style={styles.macroText}>C: {meal.carbsG}g</Text>
      </View>
      <View style={styles.macroBadge}>
        <Text style={styles.macroText}>F: {meal.fatG}g</Text>
      </View>
    </View>
  );
}

export function ExtraMealForm({ logDate, selectedDay, onMealLogged }: { logDate: string; selectedDay: number; onMealLogged?: () => void }) {
  const [show, setShow] = useState(false);
  const [foods, setFoods] = useState<FoodResponse[]>([]);
  const [foodsState, setFoodsState] = useState<FoodsState>('idle');
  const [query, setQuery] = useState('');
  const [food, setFood] = useState<FoodResponse | null>(null);
  const [grams, setGrams] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // The list is only needed once the form opens. Entering a meal by hand still
  // works if it can't be loaded.
  useEffect(() => {
    if (!show || foodsState !== 'idle') return;
    setFoodsState('loading');
    recommendationService.listFoods()
      .then((list) => {
        setFoods(list);
        setFoodsState('ready');
      })
      .catch(() => setFoodsState('failed'));
  }, [show, foodsState]);

  const suggestions = food ? [] : searchFoods(foods, query, MAX_SUGGESTIONS);
  const gramsValue = parseAmount(grams);
  const trimmedType = mealType.trim();

  let meal: MealEntry | null = null;
  if (food) {
    if (gramsValue) {
      meal = foodToMealEntry(food, gramsValue, trimmedType);
    }
  } else if (query.trim()) {
    meal = {
      mealType: trimmedType,
      name: query.trim(),
      calories: Math.round(parseAmount(calories) ?? 0),
      proteinG: parseAmount(protein),
      carbsG: parseAmount(carbs),
      fatG: parseAmount(fat),
    };
  }
  const canSave = meal !== null && trimmedType.length > 0;

  const pickFood = (picked: FoodResponse) => {
    Keyboard.dismiss();
    setFood(picked);
    setQuery(picked.name);
    setGrams(String(picked.portion_size || 100));
  };

  // Back to typing, starting from the food's name.
  const clearFood = () => {
    setFood(null);
    setGrams('');
  };

  const close = () => {
    setShow(false);
    setQuery('');
    setFood(null);
    setGrams('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setMealType('');
    // Try the list again next time.
    setFoodsState((state) => (state === 'failed' ? 'idle' : state));
  };

  const handleSubmit = async () => {
    const entry = meal;
    if (!entry || !canSave) return;
    setIsSaving(true);
    try {
      // progressService returns null instead of throwing, so a failed log stops
      // here rather than adding a meal that never counted.
      const log = await progressService.upsertDailyLog({ logDate, meals: [entry] });
      if (!log) {
        throw new Error('Failed to log extra meal.');
      }
      await recommendationService.addExtraMeal(selectedDay, entry);
      onMealLogged?.();
      close();
    } catch (e) {
      showDialog({ title: 'Error', message: 'Failed to log extra meal.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!show) {
    return (
      <View style={{ marginTop: theme.spacing.lg }}>
        <AppButton title="Add Extra Meal" variant="ghost" onPress={() => setShow(true)} />
      </View>
    );
  }

  return (
    <AppCard style={{ marginTop: theme.spacing.lg }}>
      <Text style={styles.title}>Log Extra Meal</Text>
      <View style={styles.fields}>
        {food ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Food</Text>
            <View style={styles.selectedFood}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
              <View style={styles.selectedText}>
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.hint}>{food.kcal} kcal per {food.portion_size} g</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Change food" hitSlop={8} onPress={clearFood}>
                <Ionicons name="close" size={20} color={theme.colors.muted} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.fieldGroup}>
            <AppTextInput
              label="Food"
              placeholder="Search foods or type your own"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {suggestions.length > 0 ? (
              <View style={styles.suggestions}>
                {suggestions.map((item, index) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => pickFood(item)}
                    style={({ pressed }) => [styles.suggestion, index > 0 && styles.suggestionDivider, pressed && styles.pressed]}
                  >
                    <Text style={styles.foodName}>{item.name}</Text>
                    <Text style={styles.hint}>
                      {item.kcal} kcal · P {item.protein}g · C {item.carbs}g · F {item.fats}g per {item.portion_size} g
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Text style={styles.hint}>{getSearchHint(foodsState, query, suggestions.length > 0)}</Text>
          </View>
        )}

        {food ? (
          <View style={styles.fieldGroup}>
            <AppTextInput label="Amount" inputMode="decimal" suffix="g" value={grams} onChangeText={setGrams} />
            {meal ? <MacroBadges meal={meal} /> : <Text style={styles.hint}>Enter how many grams you had.</Text>}
          </View>
        ) : (
          <>
            <AppTextInput label="Calories (optional)" placeholder="e.g. 250" value={calories} onChangeText={setCalories} inputMode="numeric" />
            <View style={styles.macroInputs}>
              <View style={styles.macroInput}>
                <AppTextInput label="Protein (g)" placeholder="0" value={protein} onChangeText={setProtein} inputMode="decimal" />
              </View>
              <View style={styles.macroInput}>
                <AppTextInput label="Carbs (g)" placeholder="0" value={carbs} onChangeText={setCarbs} inputMode="decimal" />
              </View>
              <View style={styles.macroInput}>
                <AppTextInput label="Fat (g)" placeholder="0" value={fat} onChangeText={setFat} inputMode="decimal" />
              </View>
            </View>
          </>
        )}

        <AppTextInput label="Meal Type" placeholder="e.g. Snack, Dessert" value={mealType} onChangeText={setMealType} />
        <View style={styles.actions}>
          <AppButton title="Cancel" variant="ghost" onPress={close} style={{ flex: 1 }} />
          <AppButton title="Save" onPress={handleSubmit} disabled={!canSave} loading={isSaving} style={{ flex: 1 }} />
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  fields: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  fieldGroup: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  hint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 16,
  },
  selectedFood: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primarySoft,
  },
  selectedText: {
    flex: 1,
    gap: 2,
  },
  foodName: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  suggestions: {
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  suggestion: {
    gap: 2,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  suggestionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  pressed: {
    backgroundColor: theme.colors.secondarySurface,
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  macroBadge: {
    backgroundColor: theme.colors.secondarySurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  macroText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  macroInputs: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  macroInput: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
});
