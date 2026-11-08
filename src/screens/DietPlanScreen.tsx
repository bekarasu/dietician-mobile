import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, ScrollView, ScrollViewInstance, StyleSheet, Text, View, Pressable } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { showDialog } from '../features/dialog/dialogStore';
import { ExtraMealForm } from '../features/dietPlan/ExtraMealForm';
import { logPlanMeal } from '../features/dietPlan/logPlanMeal';
import { formatStartsIn, getPlanDayDate, getPlanSchedule } from '../features/dietPlan/planSchedule';
import { getStatusMessage } from '../features/leaderboard/scoreMessages';
import { AppStackParamList } from '../navigation/navigationTypes';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useProfileStore } from '../store/useProfileStore';
import { leaderboardService } from '../services/leaderboardService';
import { recommendationService } from '../services/recommendationService';
import { theme } from '../theme/theme';
import { DailyPoints, DayPoints, DietMeal, DietPlan, WeekPoints } from '../types/models';
import { formatCalendarDate, toCalendarDate } from '../utils/date';
import { formatLitres } from '../utils/formatters';

const CORE_MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];

function getCoffeeDetail(day: DayPoints) {
  if (day.waterMl === 0) {
    return 'Log water first';
  }
  if (day.coffeeCups > day.coffeeLimitCups) {
    return `${day.coffeeCups} cups, over your ${day.coffeeLimitCups}`;
  }
  return `${day.coffeeCups} of ${day.coffeeLimitCups} cups`;
}

function PointsRow({ label, detail, points, max }: { label: string; detail: string; points: number; max: number }) {
  return (
    <View style={styles.pointsRow}>
      <Text style={styles.pointsRowLabel}>{label}</Text>
      <Text style={styles.pointsRowDetail}>{detail}</Text>
      <Text style={styles.pointsRowValue}>{points} / {max}</Text>
    </View>
  );
}

function DayPointsCard({ day, week, takenCoreMeals }: { day: DayPoints; week?: WeekPoints; takenCoreMeals: number }) {
  const isCounted = day.status === 'SCORED' || day.status === 'IN_PROGRESS';
  const soFar = day.status === 'IN_PROGRESS' ? ' so far' : '';

  let detail: string | null = null;
  if (day.status === 'UPCOMING') {
    detail = 'Log your meals, water and coffee on this day to earn them.';
  } else if (day.status === 'NOT_SCORED') {
    detail = getStatusMessage(day.statusReason);
  }

  let weekLine: string | null = null;
  let weekNote: string | null = null;
  if (isCounted && week) {
    weekLine = week.totalScore !== null
      ? `This week: ${week.totalScore} = weight ${week.weightPoints} + meals ${week.mealPoints} + water ${week.waterPoints} + coffee ${week.coffeePoints}`
      : getStatusMessage(week.statusReason);
    const today = toCalendarDate(new Date());
    weekNote = today >= week.periodStart && today < week.periodEndExclusive
      ? 'Meal, water and coffee points for the week are the average of your days. Today isn\'t counted against you until it ends.'
      : 'Meal, water and coffee points for the week are the average of your days.';
  }

  let value = '–';
  if (isCounted) {
    value = String(day.points);
  } else if (day.status === 'UPCOMING') {
    value = `Up to ${day.maxPoints}`;
  }

  return (
    <AppCard style={styles.pointsCard}>
      <View style={styles.pointsHeader}>
        <View style={styles.goalsTitleContainer}>
          <Ionicons name="trophy-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.pointsTitle}>Day points</Text>
        </View>
        <Text style={styles.pointsValue}>
          {value}
          {isCounted ? <Text style={styles.pointsMax}> / {day.maxPoints}</Text> : null}
        </Text>
      </View>
      {detail ? <Text style={styles.goalsText}>{detail}</Text> : null}
      {isCounted ? (
        <View style={styles.pointsRows}>
          <PointsRow label="Meals" detail={`${day.mealsLogged} of 3 logged${soFar}`} points={day.mealPoints} max={day.maxMealPoints} />
          <PointsRow label="Water" detail={`${formatLitres(day.waterMl)} of ${formatLitres(day.waterTargetMl)}${soFar}`} points={day.waterPoints} max={day.maxWaterPoints} />
          <PointsRow label="Coffee" detail={getCoffeeDetail(day)} points={day.coffeePoints} max={day.maxCoffeePoints} />
        </View>
      ) : null}
      {isCounted && takenCoreMeals > day.mealsLogged ? (
        <Text style={styles.pointsHint}>Meals count on the day you mark them as taken, not the plan day they belong to.</Text>
      ) : null}
      {weekLine ? <Text style={styles.pointsWeek}>{weekLine}</Text> : null}
      {weekNote ? <Text style={styles.pointsHint}>{weekNote}</Text> : null}
    </AppCard>
  );
}

type PlanView = 'current' | 'next';

const PLAN_VIEW_OPTIONS: { label: string; value: PlanView }[] = [
  { label: 'This plan', value: 'current' },
  { label: 'Next plan', value: 'next' },
];

function PlanStatusCard({ plan, onRenew }: { plan: DietPlan; onRenew: (earliestStartDate: string) => void }) {
  const { phase, startDate, endDate, currentDay, totalDays, daysUntilStart } = getPlanSchedule(plan);
  const { earliestRenewalDate, nextPlan } = plan;
  const nextStart = nextPlan ? getPlanDayDate(nextPlan, 1) : null;

  let title = `Day ${currentDay} of ${totalDays}`;
  let detail = endDate ? `Ends ${formatCalendarDate(endDate)}` : null;

  if (phase === 'upcoming' && daysUntilStart !== null) {
    title = `Your plan starts ${formatStartsIn(daysUntilStart)}`;
    detail = `Day 1 is ${formatCalendarDate(startDate)}. Look through your meals now. Logging and scores begin on day 1.`;
  } else if (phase === 'ended' && endDate) {
    title = `Your plan ended ${formatCalendarDate(endDate)}`;
    detail = 'Check in to get your next plan.';
  } else if (currentDay !== null && currentDay === totalDays) {
    title = 'Last day of your plan';
    detail = 'Check in now so your next plan is ready in time to shop for it.';
  }

  if (nextStart) {
    detail = `Your next plan starts ${formatCalendarDate(nextStart)}.`;
  }

  if (phase === 'running' && totalDays === null) {
    return null;
  }

  return (
    <AppCard style={styles.statusCard}>
      <View style={styles.statusRow}>
        <Ionicons name="calendar-outline" size={22} color={theme.colors.primary} />
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>{title}</Text>
          {detail ? <Text style={styles.goalsText}>{detail}</Text> : null}
        </View>
      </View>
      {earliestRenewalDate ? <AppButton title="Renew My Plan" onPress={() => onRenew(earliestRenewalDate)} /> : null}
    </AppCard>
  );
}

// Points to sharing meals with friends, or says the plan on screen is shared.
function SharedPlanCard({ plan, onOpen }: { plan: DietPlan; onOpen: () => void }) {
  const isShared = !!plan.sharedGroupId;

  return (
    <AppCard style={styles.statusCard}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={styles.statusRow}>
        <Ionicons name="people-outline" size={22} color={theme.colors.primary} />
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>{isShared ? 'Shared plan' : 'Share meals with friends'}</Text>
          <Text style={styles.goalsText}>
            {isShared
              ? 'Your group has the same meals, each with portions for their own goal. Tap to see who\'s in it.'
              : 'Eat the same meals as up to 2 friends, with portions for your own goal and weight.'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
      </Pressable>
    </AppCard>
  );
}

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

function MealCard({ meal, logDate, isLogged, isExtra, canLog = true, onMealLogged }: { meal: DietMeal; logDate: string; isLogged?: boolean; isExtra?: boolean; canLog?: boolean; onMealLogged?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const updateActiveDietPlan = useDietPlanStore((state) => state.updateActiveDietPlan);
  const profile = useProfileStore((state) => state.profile);
  const availableIngredients = profile?.availableIngredients || [];

  const swap = async () => {
    setIsSwapping(true);
    try {
      await recommendationService.swapMeal(meal.id);
      onMealLogged?.();
    } catch (e) {
      showDialog({ title: 'Error', message: 'Failed to swap meal.', tone: 'danger' });
    } finally {
      setIsSwapping(false);
    }
  };

  // A shared meal changes for the whole group, so they're asked first.
  const handleSwap = () => {
    if (!meal.isShared) {
      swap();
      return;
    }
    showDialog({
      title: 'Swap for everyone?',
      message: 'This meal changes for everyone in your group who hasn\'t eaten it yet, each with their own portion.',
      icon: 'swap-horizontal-outline',
      buttons: [
        { text: 'Swap for everyone', onPress: swap },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  const handleLogMeal = async () => {
    try {
      await logPlanMeal(meal, logDate);
      onMealLogged?.();
    } catch (e) {
      showDialog({ title: 'Error', message: 'Failed to log meal.', tone: 'danger' });
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
              {meal.isShared && (
                <View style={{ backgroundColor: theme.colors.primarySoft, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.primary }}>SHARED</Text>
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
                {isSwapping ? (
                  <View style={{ padding: theme.spacing.md, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.muted, marginTop: theme.spacing.xs }}>Swapping meal...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                    <AppButton title="Swap Meal" variant="ghost" onPress={handleSwap} style={{ flex: 1 }} />
                    {canLog && <AppButton title="Meal Is Taken" onPress={handleLogMeal} style={{ flex: 1 }} />}
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

export function DietPlanScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { activePlan, isLoading, fetchActivePlan } = useDietPlanStore();
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [planView, setPlanView] = useState<PlanView>('current');

  const [dailyPoints, setDailyPoints] = useState<DailyPoints | null>(null);
  const pointsRequest = useRef(0);
  const dayScrollRef = useRef<ScrollViewInstance>(null);
  const dayButtonX = useRef<Record<number, number>>({});

  const nextPlan = activePlan?.nextPlan ?? null;
  const isNextPlanShown = planView === 'next' && nextPlan !== null;
  const plan = isNextPlanShown ? nextPlan : activePlan;

  const schedule = plan ? getPlanSchedule(plan) : null;
  // The day of the plan on screen that is today, while it's running.
  const todayDay = !isNextPlanShown && schedule?.phase === 'running' ? schedule.currentDay : null;
  // Day 1 of a plan that hasn't started says when it does: "Tomorrow", "In 3 days".
  const startsIn = schedule?.daysUntilStart != null ? formatStartsIn(schedule.daysUntilStart) : null;
  const startsInLabel = startsIn ? startsIn[0].toUpperCase() + startsIn.slice(1) : null;

  const planStart = activePlan?.startDate.slice(0, 10);
  const planEnd = activePlan?.endDate?.slice(0, 10);

  // Points are extra information, so a failure only hides them.
  const loadDailyPoints = useCallback(async () => {
    const request = ++pointsRequest.current;
    if (!planStart || !planEnd) {
      setDailyPoints(null);
      return;
    }
    try {
      const points = await leaderboardService.getDailyPoints(planStart, planEnd);
      if (request === pointsRequest.current) {
        setDailyPoints(points);
      }
    } catch (e) {
      if (request === pointsRequest.current) {
        setDailyPoints(null);
      }
    }
  }, [planStart, planEnd]);

  // The tab stays mounted for days, and which plan applies changes with the date.
  useFocusEffect(
    useCallback(() => {
      fetchActivePlan();
      loadDailyPoints();
    }, [fetchActivePlan, loadDailyPoints]),
  );

  const scrollToDay = (day: number) => {
    const x = dayButtonX.current[day];
    if (x !== undefined) {
      dayScrollRef.current?.scrollTo({ x: Math.max(x - theme.spacing.lg, 0), animated: true });
    }
  };

  // Day numbers restart with each plan. Open on today's day while the plan runs.
  useEffect(() => {
    setSelectedDay(todayDay ?? 1);
    if (todayDay !== null) {
      scrollToDay(todayDay);
    }
  }, [plan?.id, todayDay]);

  if (isLoading && !activePlan) {
    return (
      <ScreenContainer contentStyle={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!activePlan || !plan) {
    return (
      <ScreenContainer contentStyle={styles.centered}>
        <Ionicons name="restaurant-outline" size={64} color={theme.colors.muted} />
        <Text style={styles.emptyTitle}>No Active Diet Plan</Text>
        <Text style={styles.emptyText}>You don't have an active diet plan yet. Generate one to see your meals here.</Text>
      </ScreenContainer>
    );
  }

  // Find unique days from the meals
  const days = Array.from(new Set(plan.meals.map(m => m.dayOfWeek))).sort((a, b) => a - b);

  // If the currently selected day is not in the plan (shouldn't happen, but just in case)
  if (!days.includes(selectedDay) && days.length > 0) {
    setSelectedDay(days[0]);
  }

  const logDate = getPlanDayDate(plan, selectedDay);
  // Meals before a plan starts wouldn't count towards it, so they can't be logged yet.
  const canLog = !isNextPlanShown && schedule?.phase !== 'upcoming';

  const onMealLogged = () => {
    fetchActivePlan();
    loadDailyPoints();
  };

  const allMealsForDay = plan.meals.filter(m => m.dayOfWeek === selectedDay);
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

  // The next plan hasn't started, so it has no points yet.
  const dayPoints = isNextPlanShown ? undefined : dailyPoints?.days.find((day) => day.date === logDate);
  const weekPoints = dailyPoints?.weeks.find((week) => logDate >= week.periodStart && logDate < week.periodEndExclusive);
  const takenCoreMeals = new Set(
    allMealsForDay.filter((meal) => meal.isTaken && CORE_MEAL_TYPES.includes(meal.mealType)).map((meal) => meal.mealType),
  ).size;

  return (
    // The extra meal form's food suggestions must take a tap while the keyboard
    // is open, and sit at the bottom of the screen, so iOS scrolls above it.
    <ScreenContainer scrollViewProps={{ keyboardShouldPersistTaps: 'handled', automaticallyAdjustKeyboardInsets: true }}>
      <SectionHeader
        title="Your Diet Plan"
        subtitle="Stay consistent with your customized nutrition plan."
      />

      <PlanStatusCard
        plan={activePlan}
        onRenew={(earliestStartDate) => navigation.navigate('PlanCheckIn', { earliestStartDate })}
      />

      {nextPlan ? <SegmentedControl onChange={setPlanView} options={PLAN_VIEW_OPTIONS} value={planView} /> : null}

      <SharedPlanCard plan={plan} onOpen={() => navigation.navigate('SharedPlan')} />

      <GoalsCard goalsText={plan.goals} />

      <ScrollView ref={dayScrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.daySelector} contentContainerStyle={styles.daySelectorContent}>
        {days.map((day) => (
          <Pressable
            key={day}
            style={[styles.dayButton, selectedDay === day && styles.dayButtonActive]}
            onPress={() => setSelectedDay(day)}
            onLayout={(event) => {
              dayButtonX.current[day] = event.nativeEvent.layout.x;
              // Today can be past the screen edge on first render.
              if (day === todayDay) {
                scrollToDay(day);
              }
            }}
          >
            <Text style={[styles.dayButtonText, selectedDay === day && styles.dayButtonTextActive]}>
              Day {day}
              {day === todayDay ? ' · Today' : ''}
              {day === 1 && startsInLabel ? ` · ${startsInLabel}` : ''}
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

      {dayPoints ? <DayPointsCard day={dayPoints} week={weekPoints} takenCoreMeals={takenCoreMeals} /> : null}

      <ShoppingListCard meals={planMeals} />

      <View style={styles.mealsContainer}>
        {planMeals.length === 0 ? (
          <Text style={styles.emptyText}>No meals found for this day.</Text>
        ) : (
          planMeals.map((meal) => {
            return (
              <MealCard key={meal.id} meal={meal} logDate={logDate} isLogged={meal.isTaken} canLog={canLog} onMealLogged={onMealLogged} />
            );
          })
        )}
        {extraMeals.length > 0 && (
          <View style={{ marginTop: theme.spacing.md }}>
            <Text style={[styles.detailTitle, { marginBottom: theme.spacing.sm, fontSize: 16 }]}>Additional Meals</Text>
            <View style={styles.extraMealsList}>
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
          </View>
        )}
        {canLog && <ExtraMealForm logDate={logDate} selectedDay={selectedDay} onMealLogged={onMealLogged} />}
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
  statusCard: {
    gap: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusText: {
    flex: 1,
  },
  statusTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  pointsCard: {
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  pointsValue: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  pointsMax: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  pointsHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  pointsRows: {
    gap: theme.spacing.xs,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pointsRowLabel: {
    width: 56,
    color: theme.colors.text,
    fontWeight: '700',
  },
  pointsRowDetail: {
    flex: 1,
    color: theme.colors.muted,
  },
  pointsRowValue: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  pointsWeek: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
    marginTop: theme.spacing.xs,
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
  extraMealsList: {
    gap: theme.spacing.md,
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
