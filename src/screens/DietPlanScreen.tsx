import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useProfileStore } from '../store/useProfileStore';
import { progressService } from '../services/progressService';
import { recommendationService } from '../services/recommendationService';
import { theme } from '../theme/theme';
import { DietMeal } from '../types/models';

function GoalsCard({ goalsText }: { goalsText: string }) {
  const [expanded, setExpanded] = useState(false);

  const renderContent = () => {
    if (!goalsText) return null;

    const sections = [
      { key: 'Target overview:', icon: 'flag-outline' },
      { key: 'Rationale:', icon: 'bulb-outline' },
      { key: 'Tips:', icon: 'list' },
    ];

    const hasSections = sections.some(s => goalsText.includes(s.key));

    if (!hasSections) {
      return <Text style={styles.goalsText}>{goalsText}</Text>;
    }

    const parts = goalsText.split(/(Target overview:|Rationale:|Tips:)/).filter(Boolean);
    
    return (
      <View style={styles.parsedGoalsContainer}>
        {parts.map((part, index) => {
          const sectionMatch = sections.find(s => s.key === part);
          if (sectionMatch) {
            return (
              <View key={index} style={styles.goalSectionHeader}>
                <Ionicons name={sectionMatch.icon as any} size={16} color={theme.colors.primary} />
                <Text style={styles.goalSectionTitle}>{part.replace(':', '')}</Text>
              </View>
            );
          }
          
          if (part.trim().length > 0) {
            if (part.includes('•')) {
              const bullets = part.split('•').filter(b => b.trim().length > 0);
              return (
                <View key={index} style={styles.bulletList}>
                  {bullets.map((bullet, bIndex) => (
                    <View key={bIndex} style={styles.bulletRow}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={[styles.goalsText, styles.bulletText]}>{bullet.trim()}</Text>
                    </View>
                  ))}
                </View>
              );
            }
            
            return <Text key={index} style={[styles.goalsText, styles.goalSectionBody]}>{part.trim()}</Text>;
          }
          return null;
        })}
      </View>
    );
  };

  return (
    <AppCard style={styles.goalsCard}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.goalsHeaderRow}>
        <View style={styles.goalsTitleContainer}>
          <View style={styles.sparkleIcon}>
            <Ionicons name="sparkles" size={14} color={theme.colors.surface} />
          </View>
          <Text style={styles.goalsTitle}>Plan Overview</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.muted} />
      </Pressable>

      {expanded ? (
        <View style={styles.goalsContentExpanded}>
          {renderContent()}
        </View>
      ) : (
        <View style={styles.goalsContentCollapsed}>
          <Text style={styles.goalsText} numberOfLines={2}>
            {goalsText.replace(/(Target overview:|Rationale:|Tips:)/g, '').trim()}
          </Text>
          <Text style={styles.readMoreText}>Read more about your plan</Text>
        </View>
      )}
    </AppCard>
  );
}

function ShoppingListCard({ meals }: { meals: DietMeal[] }) {
  const [expanded, setExpanded] = useState(false);
  const profile = useProfileStore((state) => state.profile);
  const availableIngredients = profile?.availableIngredients || [];

  const { aggregated, unparsed } = useMemo(() => {
    const agg: Record<string, { amount: number; unit: string; name: string }> = {};
    const unp: string[] = [];
    const regex = /^([\d.]+)\s*(g|ml|kg|l|tbsp|tsp|cup|cups|oz|lb|lbs|pieces|piece|slice|slices)?\s+(.*)$/i;

    meals.forEach(meal => {
      if (meal.isExtra || !meal.ingredients) return;
      meal.ingredients.forEach(ing => {
        const match = ing.trim().match(regex);
        if (match) {
          const amount = parseFloat(match[1]);
          if (isNaN(amount)) {
            unp.push(ing.trim());
            return;
          }
          const unit = (match[2] || '').toLowerCase();
          const itemName = match[3].trim();
          const normUnit = unit === 'cups' ? 'cup' : unit === 'pieces' ? 'piece' : unit === 'slices' ? 'slice' : unit === 'lbs' ? 'lb' : unit;
          const key = `${itemName.toLowerCase()}_${normUnit}`;
          if (agg[key]) {
            agg[key].amount += amount;
          } else {
            agg[key] = { amount, unit: normUnit, name: itemName };
          }
        } else {
          if (!unp.includes(ing.trim())) {
            unp.push(ing.trim());
          }
        }
      });
    });

    const sortedAgg = Object.values(agg).sort((a, b) => a.name.localeCompare(b.name));
    return { aggregated: sortedAgg, unparsed: unp };
  }, [meals]);

  if (aggregated.length === 0 && unparsed.length === 0) {
    return null;
  }

  return (
    <AppCard style={[styles.goalsCard, { marginTop: theme.spacing.md }]}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.goalsHeaderRow}>
        <View style={styles.goalsTitleContainer}>
          <View style={[styles.sparkleIcon, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="cart" size={14} color={theme.colors.surface} />
          </View>
          <Text style={styles.goalsTitle}>Daily Shopping List</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.muted} />
      </Pressable>

      {expanded && (
        <View style={styles.goalsContentExpanded}>
          <Text style={[styles.goalsText, { marginBottom: theme.spacing.sm }]}>
            Calculated ingredients for today's plan meals:
          </Text>
          {aggregated.map((item, idx) => {
            const inFridge = availableIngredients.some((ai) => item.name.toLowerCase().includes(ai.toLowerCase()));
            return (
              <View key={`agg-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Text style={[styles.goalsText, { flexShrink: 1 }]}>• {item.name}</Text>
                  {inFridge && <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />}
                </View>
                <Text style={[styles.goalsText, { fontWeight: '700', marginLeft: 8 }]}>{Math.round(item.amount * 10) / 10} {item.unit}</Text>
              </View>
            );
          })}
          {unparsed.map((item, idx) => {
            const inFridge = availableIngredients.some((ai) => item.toLowerCase().includes(ai.toLowerCase()));
            return (
              <View key={`unp-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 6 }}>
                <Text style={[styles.goalsText, { flexShrink: 1 }]}>• {item}</Text>
                {inFridge && <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />}
              </View>
            );
          })}
        </View>
      )}
    </AppCard>
  );
}

function MealCard({ meal, logDate, isLogged, isExtra, onMealLogged }: { meal: DietMeal; logDate: string; isLogged?: boolean; isExtra?: boolean; onMealLogged?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [feedback, setFeedback] = useState('');
  const updateActiveDietPlan = useDietPlanStore((state) => state.updateActiveDietPlan);
  const profile = useProfileStore((state) => state.profile);
  const availableIngredients = profile?.availableIngredients || [];

  const handleSwap = async () => {
    if (!feedback.trim()) return;
    const fullFeedback = `Replace ${meal.name} (${meal.mealType} on day ${meal.dayOfWeek}). Reason: ${feedback}`;
    await updateActiveDietPlan(fullFeedback, meal.dayOfWeek);
    setShowSwap(false);
    setFeedback('');
  };

  const handleLogMeal = async () => {
    try {
      await progressService.upsertDailyLog({
        logDate,
        meals: [{
          mealType: meal.mealType,
          name: meal.name,
          calories: meal.calories,
          proteinG: meal.proteinG,
          carbsG: meal.carbsG,
          fatG: meal.fatG
        }]
      });
      await recommendationService.markMealAsTaken(meal.id);
      onMealLogged?.();
    } catch (e) {
      Alert.alert('Error', 'Failed to log meal.');
    }
  };

  return (
    <Pressable onPress={() => setExpanded(!expanded)}>
      <AppCard style={[styles.mealCard, isLogged && { backgroundColor: 'rgba(15, 118, 110, 0.08)', borderColor: theme.colors.primary, borderWidth: 1 }]}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.mealType}>{meal.mealType}</Text>
              {isExtra && (
                <View style={{ backgroundColor: theme.colors.warningSurface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.text }}>EXTRA</Text>
                </View>
              )}
              {isLogged && <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />}
            </View>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.muted} />
          </View>
          <Text style={styles.mealName}>{meal.name}</Text>
          
          <View style={styles.macroRow}>
            <View style={styles.macroBadge}>
              <Text style={styles.macroText}>{meal.calories} kcal</Text>
            </View>
            {typeof meal.proteinG === 'number' && !isNaN(meal.proteinG) && (
              <View style={styles.macroBadge}>
                <Text style={styles.macroText}>P: {meal.proteinG}g</Text>
              </View>
            )}
            {typeof meal.carbsG === 'number' && !isNaN(meal.carbsG) && (
              <View style={styles.macroBadge}>
                <Text style={styles.macroText}>C: {meal.carbsG}g</Text>
              </View>
            )}
            {typeof meal.fatG === 'number' && !isNaN(meal.fatG) && (
              <View style={styles.macroBadge}>
                <Text style={styles.macroText}>F: {meal.fatG}g</Text>
              </View>
            )}
          </View>
        </View>

        {expanded && (
          <View style={styles.mealDetails}>
            <View style={styles.divider} />
            
            {!!meal.description?.trim() && (
              <>
                <Text style={styles.detailTitle}>Description</Text>
                <Text style={styles.detailText}>{meal.description}</Text>
              </>
            )}
            
            {meal.ingredients && meal.ingredients.length > 0 && (
              <>
                <Text style={[styles.detailTitle, !!meal.description?.trim() && { marginTop: theme.spacing.md }]}>Ingredients</Text>
                {meal.ingredients.map((ingredient, i) => {
                  const inFridge = availableIngredients.some(
                    (ai) => ingredient.toLowerCase().includes(ai.toLowerCase())
                  );
                  return (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.detailText}>• {ingredient}</Text>
                      {inFridge && <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />}
                    </View>
                  );
                })}
              </>
            )}

            {!isLogged && (
              <>
                <View style={styles.divider} />
                {!showSwap ? (
                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                    <AppButton title="Swap Meal" variant="ghost" onPress={() => setShowSwap(true)} style={{ flex: 1 }} />
                    <AppButton title="Meal Is Taken" onPress={handleLogMeal} style={{ flex: 1 }} />
                  </View>
                ) : (
                  <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                    <AppTextInput
                      label="Feedback"
                      placeholder="Why do you want to swap? (e.g. want something lighter)"
                      value={feedback}
                      onChangeText={setFeedback}
                    />
                    <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                      <AppButton title="Cancel" variant="ghost" onPress={() => setShowSwap(false)} style={{ flex: 1 }} />
                      <AppButton title="Confirm Swap" onPress={handleSwap} style={{ flex: 1 }} />
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </AppCard>
    </Pressable>
  );
}

function ExtraMealForm({ logDate, selectedDay, onMealLogged }: { logDate: string; selectedDay: number; onMealLogged?: () => void }) {
  const [show, setShow] = useState(false);
  const [mealType, setMealType] = useState('');
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');

  const handleSubmit = async () => {
    if (!name.trim() || !mealType.trim()) return;
    try {
      const cals = parseInt(calories) || 0;
      await progressService.upsertDailyLog({
        logDate,
        meals: [{
          mealType: mealType,
          name: name,
          calories: cals,
        }]
      });
      await recommendationService.addExtraMeal(selectedDay, mealType, name, cals);
      onMealLogged?.();
      setShow(false);
      setMealType('');
      setName('');
      setCalories('');
    } catch (e) {
      Alert.alert('Error', 'Failed to log extra meal.');
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
      <Text style={styles.mealName}>Log Extra Meal</Text>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <AppTextInput label="Meal Type" placeholder="e.g. Snack, Dessert" value={mealType} onChangeText={setMealType} />
        <AppTextInput label="Name" placeholder="e.g. Chocolate Bar" value={name} onChangeText={setName} />
        <AppTextInput label="Calories (optional)" placeholder="e.g. 250" value={calories} onChangeText={setCalories} keyboardType="numeric" />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
          <AppButton title="Cancel" variant="ghost" onPress={() => setShow(false)} style={{ flex: 1 }} />
          <AppButton title="Save" onPress={handleSubmit} style={{ flex: 1 }} />
        </View>
      </View>
    </AppCard>
  );
}

export function DietPlanScreen() {
  const { activePlan, isLoading, fetchActivePlan } = useDietPlanStore();
  const [selectedDay, setSelectedDay] = useState<number>(1);

  useEffect(() => {
    fetchActivePlan();
  }, [fetchActivePlan]);

  if (isLoading && !activePlan) {
    return (
      <ScreenContainer contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!activePlan) {
    return (
      <ScreenContainer contentStyle={styles.centered}>
        <Ionicons name="restaurant-outline" size={64} color={theme.colors.muted} />
        <Text style={styles.emptyTitle}>No Active Diet Plan</Text>
        <Text style={styles.emptyText}>You don't have an active diet plan yet. Generate one to see your meals here.</Text>
      </ScreenContainer>
    );
  }

  // Find unique days from the meals
  const days = Array.from(new Set(activePlan.meals.map(m => m.dayOfWeek))).sort((a, b) => a - b);
  
  // If the currently selected day is not in the plan (shouldn't happen, but just in case)
  if (!days.includes(selectedDay) && days.length > 0) {
    setSelectedDay(days[0]);
  }

  const getLogDateForDay = (day: number) => {
    if (!activePlan) return '';
    const d = new Date(activePlan.startDate);
    d.setDate(d.getDate() + (day - 1));
    return d.toISOString().split('T')[0];
  };
  const logDate = getLogDateForDay(selectedDay);

  const onMealLogged = () => {
    fetchActivePlan();
  };

  const allMealsForDay = activePlan.meals.filter(m => m.dayOfWeek === selectedDay);
  const planMeals = allMealsForDay.filter(m => !m.isExtra);
  const extraMeals = allMealsForDay.filter(m => m.isExtra);

  // Sort plan meals logically: Breakfast -> Lunch -> Snack -> Dinner
  const mealOrder: Record<string, number> = { Breakfast: 1, Lunch: 2, Snack: 3, Dinner: 4 };
  planMeals.sort((a, b) => {
    const aOrder = mealOrder[a.mealType] || 99;
    const bOrder = mealOrder[b.mealType] || 99;
    return aOrder - bOrder;
  });

  const takenCalories = allMealsForDay
    .filter(m => m.isTaken)
    .reduce((sum, meal) => sum + (meal.calories || 0), 0);

  const planTotalCalories = planMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);

  return (
    <ScreenContainer>
      <SectionHeader
        title="Your Diet Plan"
        subtitle="Stay consistent with your customized nutrition plan."
      />

      <GoalsCard goalsText={activePlan.goals} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector} contentContainerStyle={styles.daySelectorContent}>
        {days.map((day) => (
          <Pressable
            key={day}
            style={[styles.dayButton, selectedDay === day && styles.dayButtonActive]}
            onPress={() => setSelectedDay(day)}
          >
            <Text style={[styles.dayButtonText, selectedDay === day && styles.dayButtonTextActive]}>
              Day {day}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.xs }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.text }}>Daily Progress</Text>
          <Text style={{ fontSize: 14, fontWeight: '800', color: takenCalories > planTotalCalories ? theme.colors.danger : theme.colors.primary }}>
            {takenCalories} <Text style={{ color: theme.colors.muted, fontWeight: '600' }}>/ {planTotalCalories} kcal</Text>
          </Text>
        </View>
        <View style={{ height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${Math.min(100, (takenCalories / (planTotalCalories || 1)) * 100)}%`, backgroundColor: takenCalories > planTotalCalories ? theme.colors.danger : theme.colors.primary, borderRadius: 4 }} />
        </View>
      </View>

      <ShoppingListCard meals={planMeals} />

      <View style={styles.mealsContainer}>
        {planMeals.length === 0 ? (
          <Text style={styles.emptyText}>No meals found for this day.</Text>
        ) : (
          planMeals.map((meal) => {
            return (
              <MealCard key={meal.id} meal={meal} logDate={logDate} isLogged={meal.isTaken} onMealLogged={onMealLogged} />
            );
          })
        )}
        {extraMeals.length > 0 && (
          <View style={{ marginTop: theme.spacing.md }}>
            <Text style={[styles.detailTitle, { marginBottom: theme.spacing.sm, fontSize: 16 }]}>Additional Meals</Text>
            {extraMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                logDate={logDate}
                isLogged={true}
                isExtra={true}
              />
            ))}
          </View>
        )}
        <ExtraMealForm logDate={logDate} selectedDay={selectedDay} onMealLogged={onMealLogged} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '700',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  emptyText: {
    color: theme.colors.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  goalsCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
    borderWidth: 1,
    padding: 0, // Reset padding to manage it internally
    overflow: 'hidden',
  },
  goalsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(59, 130, 246, 0.05)', // Subtle primary tint
  },
  goalsTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sparkleIcon: {
    backgroundColor: theme.colors.primary,
    padding: 4,
    borderRadius: 12,
  },
  goalsTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  goalsContentCollapsed: {
    padding: theme.spacing.md,
    paddingTop: 0,
  },
  goalsContentExpanded: {
    padding: theme.spacing.md,
    paddingTop: 0,
  },
  parsedGoalsContainer: {
    gap: theme.spacing.sm,
  },
  goalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    marginBottom: 2,
  },
  goalSectionTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  goalSectionBody: {
    marginBottom: theme.spacing.xs,
  },
  bulletList: {
    gap: theme.spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: theme.spacing.md,
  },
  bulletPoint: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginRight: 6,
    fontSize: 16,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
  },
  goalsText: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
  readMoreText: {
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
    fontSize: 13,
  },
  daySelector: {
    marginBottom: theme.spacing.lg,
  },
  daySelectorContent: {
    gap: theme.spacing.sm,
  },
  dayButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dayButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  dayButtonTextActive: {
    color: theme.colors.surface,
  },
  mealsContainer: {
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  mealCard: {
    padding: theme.spacing.md,
  },
  mealHeader: {
    gap: theme.spacing.xs,
  },
  mealTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealType: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mealName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: theme.spacing.xs,
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
  mealDetails: {
    marginTop: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  detailTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  detailText: {
    color: theme.colors.muted,
    lineHeight: 22,
    marginBottom: theme.spacing.xs,
  },
});
