import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useDietPlanStore } from '../store/useDietPlanStore';
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

function MealCard({ meal }: { meal: DietMeal }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable onPress={() => setExpanded(!expanded)}>
      <AppCard style={styles.mealCard}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleRow}>
            <Text style={styles.mealType}>{meal.mealType}</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.muted} />
          </View>
          <Text style={styles.mealName}>{meal.name}</Text>
          
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
        </View>

        {expanded && (
          <View style={styles.mealDetails}>
            <View style={styles.divider} />
            <Text style={styles.detailTitle}>Description</Text>
            <Text style={styles.detailText}>{meal.description}</Text>
            
            <Text style={styles.detailTitle}>Ingredients</Text>
            {meal.ingredients.map((ingredient, i) => (
              <Text key={i} style={styles.detailText}>• {ingredient}</Text>
            ))}
          </View>
        )}
      </AppCard>
    </Pressable>
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

  const mealsForDay = activePlan.meals.filter(m => m.dayOfWeek === selectedDay);

  // Sort meals logically: Breakfast -> Lunch -> Snack -> Dinner
  const mealOrder: Record<string, number> = { Breakfast: 1, Lunch: 2, Snack: 3, Dinner: 4 };
  mealsForDay.sort((a, b) => {
    const aOrder = mealOrder[a.mealType] || 99;
    const bOrder = mealOrder[b.mealType] || 99;
    return aOrder - bOrder;
  });

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

      <View style={styles.mealsContainer}>
        {mealsForDay.length === 0 ? (
          <Text style={styles.emptyText}>No meals found for this day.</Text>
        ) : (
          mealsForDay.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))
        )}
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
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
