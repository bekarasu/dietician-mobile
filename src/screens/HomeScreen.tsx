import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../components/ScreenContainer';
import { SegmentRing } from '../components/SegmentRing';
import { UserAvatar } from '../components/UserAvatar';
import { HEALTH_NOTICE } from '../constants/health';
import { showDialog } from '../features/dialog/dialogStore';
import { logPlanMeal } from '../features/dietPlan/logPlanMeal';
import { NotificationBell } from '../features/notifications/NotificationBell';
import { formatStartsIn, getPlanSchedule } from '../features/dietPlan/planSchedule';
import { getStatusMessage } from '../features/leaderboard/scoreMessages';
import { getGoalProgress, getWeeklyChange } from '../features/progress/progressSummary';
import { AppStackParamList, AppTabParamList } from '../navigation/navigationTypes';
import { leaderboardService } from '../services/leaderboardService';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useHydrationStore } from '../store/useHydrationStore';
import { useProfileStore } from '../store/useProfileStore';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { DayPoints, DietMeal, DietPlan, WeekActivity } from '../types/models';
import { formatCalendarDate, toCalendarDate } from '../utils/date';
import { formatGoalType, formatKg, formatKgChange, formatLitres } from '../utils/formatters';

type HomeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<AppTabParamList, 'Home'>,
  NativeStackNavigationProp<AppStackParamList>
>;

const MEAL_ORDER: Record<string, number> = { Breakfast: 1, Lunch: 2, Snack: 3, Dinner: 4 };

const MEAL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Breakfast: 'sunny-outline',
  Lunch: 'restaurant-outline',
  Snack: 'nutrition-outline',
  Dinner: 'moon-outline',
};

const formatNumber = new Intl.NumberFormat('en-US').format;

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  return hour < 18 ? 'Good afternoon' : 'Good evening';
}

function getPlanLabel(plan: DietPlan | null) {
  if (!plan) {
    return null;
  }
  const { phase, currentDay, totalDays, daysUntilStart } = getPlanSchedule(plan);
  if (phase === 'upcoming' && daysUntilStart !== null) {
    return `Plan starts ${formatStartsIn(daysUntilStart)}`;
  }
  if (phase === 'ended') {
    return 'Plan ended';
  }
  return totalDays ? `Day ${currentDay} of ${totalDays}` : null;
}

export function HomeScreen() {
  const navigation = useNavigation<HomeNavigation>();
  const profile = useProfileStore((state) => state.profile);
  const entries = useProgressStore((state) => state.entries);
  const activePlan = useDietPlanStore((state) => state.activePlan);
  const fetchActivePlan = useDietPlanStore((state) => state.fetchActivePlan);

  const hydration = useHydrationStore((state) => state.hydration);
  const coffee = useHydrationStore((state) => state.coffee);
  const bootstrapHydration = useHydrationStore((state) => state.bootstrap);
  const setHydrationTargets = useHydrationStore((state) => state.setTargets);
  const addWater = useHydrationStore((state) => state.addWater);
  const addCoffee = useHydrationStore((state) => state.addCoffee);

  const [activity, setActivity] = useState<WeekActivity | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loggingMealId, setLoggingMealId] = useState<string | null>(null);
  const activityRequest = useRef(0);

  useEffect(() => {
    bootstrapHydration();
  }, [bootstrapHydration]);

  useEffect(() => {
    if (profile) {
      setHydrationTargets(profile.targetWaterMl ?? 0, profile.targetCoffeeCups ?? 0);
    }
  }, [profile, setHydrationTargets]);

  // Points and the week's score sit beside other things on screen, so a
  // failure keeps what was shown rather than blanking the card.
  const loadActivity = useCallback(async () => {
    const request = ++activityRequest.current;
    try {
      const next = await leaderboardService.getWeekActivity();
      if (request === activityRequest.current) {
        setActivity(next);
      }
    } catch (e) {
      // Shown as unavailable until the next load succeeds.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchActivePlan();
      loadActivity();
    }, [fetchActivePlan, loadActivity]),
  );

  const refresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchActivePlan(), loadActivity(), bootstrapHydration()]);
    setIsRefreshing(false);
  };

  const markEaten = async (meal: DietMeal) => {
    setLoggingMealId(meal.id);
    try {
      await logPlanMeal(meal, toCalendarDate(new Date()));
      await fetchActivePlan();
      loadActivity();
    } catch (e) {
      showDialog({ title: 'Error', message: 'We couldn\'t log this meal. Please try again.', tone: 'danger' });
    } finally {
      setLoggingMealId(null);
    }
  };

  const logWater = async () => {
    await addWater(250);
    loadActivity();
  };

  const logCoffee = async () => {
    await addCoffee(1);
    loadActivity();
  };

  const now = new Date();
  const today = toCalendarDate(now);
  const todayPoints = activity?.days.find((day) => day.date === today) ?? null;
  const planLabel = getPlanLabel(activePlan);

  return (
    <ScreenContainer
      scrollViewProps={{
        bounces: true,
        refreshControl: <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={theme.colors.primary} />,
      }}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.date}>
            {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(now)}
          </Text>
          <Text style={styles.greeting}>
            {getGreeting(now)}
            {profile?.name ? `, ${profile.name}` : ''}
          </Text>
          <View style={styles.chips}>
            {profile ? <Chip icon="flag-outline" label={formatGoalType(profile.goalType)} /> : null}
            {planLabel ? <Chip icon="calendar-outline" label={planLabel} /> : null}
          </View>
        </View>
        <View style={styles.headerActions}>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
          <Pressable accessibilityLabel="Profile" accessibilityRole="button" onPress={() => navigation.navigate('ProfileGoals')}>
            <UserAvatar name={profile?.name || '?'} />
          </Pressable>
        </View>
      </View>

      <TodayCard day={todayPoints} activity={activity} onOpenWeek={() => navigation.navigate('Leaderboard')} />

      <MealsCard
        plan={activePlan}
        loggingMealId={loggingMealId}
        onMarkEaten={markEaten}
        onOpenPlan={() => navigation.navigate('DietPlan')}
      />

      <View style={styles.tiles}>
        <QuickTile
          icon="water"
          color={theme.colors.water}
          tint={theme.colors.waterSoft}
          title="Water"
          value={formatLitres(hydration.waterMl)}
          target={hydration.targetWaterMl > 0 ? `of ${formatLitres(hydration.targetWaterMl)}` : null}
          progress={hydration.targetWaterMl > 0 ? hydration.waterMl / hydration.targetWaterMl : 0}
          actionLabel="+250 ml"
          onAction={logWater}
          onOpen={() => navigation.navigate('HydrationTracking')}
        />
        <QuickTile
          icon="cafe"
          color={coffee.cups > coffee.targetCups ? theme.colors.danger : theme.colors.coffee}
          tint={theme.colors.coffeeSoft}
          title="Coffee"
          value={`${coffee.cups} ${coffee.cups === 1 ? 'cup' : 'cups'}`}
          target={coffee.targetCups > 0 ? `limit ${coffee.targetCups}` : null}
          progress={coffee.targetCups > 0 ? coffee.cups / coffee.targetCups : 0}
          actionLabel="+1 cup"
          onAction={logCoffee}
          onOpen={() => navigation.navigate('HydrationTracking')}
        />
      </View>

      <WeightCard onOpen={() => navigation.navigate('WeightProgress')} entries={entries} targetWeightKg={profile?.targetWeightKg} />

      <Text style={styles.notice}>{HEALTH_NOTICE}</Text>
    </ScreenContainer>
  );
}

function Chip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.chip}>
      <Ionicons name={icon} size={13} color={theme.colors.primary} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function PointsRow({ color, label, detail, points, max }: { color: string; label: string; detail: string; points: number; max: number }) {
  return (
    <View style={styles.pointsRow}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.pointsText}>
        <Text style={styles.pointsLabel}>{label}</Text>
        <Text style={styles.pointsDetail}>{detail}</Text>
      </View>
      <Text style={styles.pointsValue}>
        {points}
        <Text style={styles.pointsMax}>/{max}</Text>
      </Text>
    </View>
  );
}

// The day's points as one ring with an arc per habit, each sized by what it can earn.
function TodayCard({ day, activity, onOpenWeek }: { day: DayPoints | null; activity: WeekActivity | null; onOpenWeek: () => void }) {
  const isCounted = day !== null && (day.status === 'SCORED' || day.status === 'IN_PROGRESS');
  const earned = isCounted ? day : null;
  const week = activity?.week;

  let weekText = 'Your week';
  if (week && week.totalScore !== null) {
    const consistency = activity?.consistency;
    weekText = `This week: ${week.totalScore} pts${consistency != null ? ` · ${Math.round(consistency)}% consistent` : ''}`;
  } else if (week) {
    weekText = getStatusMessage(week.statusReason);
  }

  return (
    <View style={styles.todayCard}>
      <View style={styles.todayTop}>
        <SegmentRing
          segments={[
            { value: earned?.mealPoints ?? 0, max: day?.maxMealPoints ?? 30, color: theme.colors.primary },
            { value: earned?.waterPoints ?? 0, max: day?.maxWaterPoints ?? 10, color: theme.colors.water },
            { value: earned?.coffeePoints ?? 0, max: day?.maxCoffeePoints ?? 5, color: theme.colors.coffee },
          ]}
        >
          <Text style={styles.ringValue}>{earned ? earned.points : '–'}</Text>
          <Text style={styles.ringCaption}>{earned ? `of ${earned.maxPoints} today` : 'points today'}</Text>
        </SegmentRing>

        <View style={styles.todayRows}>
          {earned ? (
            <>
              <PointsRow color={theme.colors.primary} label="Meals" detail={`${earned.mealsLogged} of 3 logged`} points={earned.mealPoints} max={earned.maxMealPoints} />
              <PointsRow
                color={theme.colors.water}
                label="Water"
                detail={`${formatLitres(earned.waterMl)} of ${formatLitres(earned.waterTargetMl)}`}
                points={earned.waterPoints}
                max={earned.maxWaterPoints}
              />
              <PointsRow
                color={theme.colors.coffee}
                label="Coffee"
                detail={earned.waterMl === 0 ? 'Log water first' : `${earned.coffeeCups} of ${earned.coffeeLimitCups} cups`}
                points={earned.coffeePoints}
                max={earned.maxCoffeePoints}
              />
            </>
          ) : (
            <Text style={styles.todayMessage}>
              {day ? getStatusMessage(day.statusReason) : 'Your points for today will show here.'}
            </Text>
          )}
        </View>
      </View>

      <Pressable accessibilityRole="button" onPress={onOpenWeek} style={styles.weekRow}>
        <Ionicons name="trophy-outline" size={16} color={theme.colors.primary} />
        <Text style={styles.weekText} numberOfLines={2}>{weekText}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.muted} />
      </Pressable>
    </View>
  );
}

interface MealsCardProps {
  plan: DietPlan | null;
  loggingMealId: string | null;
  onMarkEaten: (meal: DietMeal) => void;
  onOpenPlan: () => void;
}

function MealsCard({ plan, loggingMealId, onMarkEaten, onOpenPlan }: MealsCardProps) {
  const header = (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>Today's meals</Text>
      <Pressable accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={onOpenPlan}>
        <Text style={styles.link}>Open plan</Text>
      </Pressable>
    </View>
  );

  const schedule = plan ? getPlanSchedule(plan) : null;
  if (!plan || !schedule || schedule.phase !== 'running' || schedule.currentDay === null) {
    let message = 'Create a diet plan to see your meals here.';
    if (schedule?.phase === 'upcoming' && schedule.daysUntilStart !== null) {
      message = `Your plan starts ${formatStartsIn(schedule.daysUntilStart)}, on ${formatCalendarDate(schedule.startDate)}. Look through your meals and shop for them.`;
    } else if (schedule?.phase === 'ended') {
      message = 'Your plan has ended. Check in from the plan to get your next one.';
    }
    return (
      <View style={styles.card}>
        {header}
        <Text style={styles.muted}>{message}</Text>
      </View>
    );
  }

  const dayMeals = plan.meals.filter((meal) => meal.dayOfWeek === schedule.currentDay);
  const planMeals = dayMeals
    .filter((meal) => !meal.isExtra)
    .sort((a, b) => (MEAL_ORDER[a.mealType] ?? 99) - (MEAL_ORDER[b.mealType] ?? 99));
  const nextMeal = planMeals.find((meal) => !meal.isTaken) ?? null;
  const eatenKcal = dayMeals.filter((meal) => meal.isTaken).reduce((sum, meal) => sum + (meal.calories || 0), 0);
  const plannedKcal = planMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);

  return (
    <View style={styles.card}>
      {header}

      <View style={styles.path}>
        <View style={styles.pathLine} />
        {planMeals.map((meal) => {
          const isNext = meal.id === nextMeal?.id;
          return (
            <View key={meal.id} style={styles.pathStop}>
              <View style={[styles.pathNode, meal.isTaken && styles.pathNodeDone, isNext && styles.pathNodeNext]}>
                <Ionicons
                  name={meal.isTaken ? 'checkmark' : MEAL_ICONS[meal.mealType] ?? 'ellipse-outline'}
                  size={16}
                  color={meal.isTaken ? theme.colors.surface : isNext ? theme.colors.primary : theme.colors.muted}
                />
              </View>
              <Text style={[styles.pathLabel, isNext && styles.pathLabelNext]}>{meal.mealType}</Text>
              <Text style={styles.pathKcal}>{formatNumber(meal.calories || 0)} kcal</Text>
            </View>
          );
        })}
      </View>

      {nextMeal ? (
        <View style={styles.nextMeal}>
          <Text style={styles.nextLabel}>Up next · {nextMeal.mealType}</Text>
          <Text style={styles.nextName} numberOfLines={2}>{nextMeal.name}</Text>
          <Text style={styles.nextMacros}>
            {formatNumber(nextMeal.calories || 0)} kcal · P {Math.round(nextMeal.proteinG || 0)}g · C {Math.round(nextMeal.carbsG || 0)}g · F{' '}
            {Math.round(nextMeal.fatG || 0)}g
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={loggingMealId !== null}
            onPress={() => onMarkEaten(nextMeal)}
            style={({ pressed }) => [styles.eatButton, pressed && styles.pressed]}
          >
            {loggingMealId === nextMeal.id ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.surface} />
                <Text style={styles.eatButtonText}>I ate this</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : (
        <View style={styles.allDone}>
          <Ionicons name="sparkles-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.allDoneText}>Every meal for today is logged.</Text>
        </View>
      )}

      <View style={styles.kcalRow}>
        <Text style={styles.muted}>Eaten from your plan</Text>
        <Text style={styles.kcalValue}>
          {formatNumber(eatenKcal)}
          <Text style={styles.muted}> / {formatNumber(plannedKcal)} kcal</Text>
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${plannedKcal > 0 ? Math.min(eatenKcal / plannedKcal, 1) * 100 : 0}%` }]} />
      </View>
    </View>
  );
}

interface QuickTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  tint: string;
  title: string;
  value: string;
  target: string | null;
  progress: number;
  actionLabel: string;
  onAction: () => void;
  onOpen: () => void;
}

function QuickTile({ icon, color, tint, title, value, target, progress, actionLabel, onAction, onOpen }: QuickTileProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={[styles.tile, { backgroundColor: tint }]}>
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <Text style={styles.tileTitle}>{title}</Text>
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileTarget}>{target ?? ' '}</Text>
      <View style={[styles.track, styles.tileTrack]}>
        <View style={[styles.fill, { width: `${Math.min(Math.max(progress, 0), 1) * 100}%`, backgroundColor: color }]} />
      </View>
      <Pressable
        accessibilityRole="button"
        hitSlop={theme.spacing.xs}
        onPress={onAction}
        style={({ pressed }) => [styles.tileAction, pressed && styles.pressed]}
      >
        <Text style={[styles.tileActionText, { color }]}>{actionLabel}</Text>
      </Pressable>
    </Pressable>
  );
}

function WeightCard({ entries, targetWeightKg, onOpen }: { entries: ReturnType<typeof useProgressStore.getState>['entries']; targetWeightKg?: number; onOpen: () => void }) {
  const latest = entries[entries.length - 1];
  const change = getWeeklyChange(entries);
  const goal = getGoalProgress(entries, targetWeightKg);

  return (
    <Pressable accessibilityRole="button" onPress={onOpen} style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Weight</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      </View>
      {latest ? (
        <>
          <View style={styles.weightRow}>
            <Text style={styles.weightValue}>{formatKg(latest.weightKg)}</Text>
            {change !== null ? (
              <View style={styles.changeChip}>
                <Text style={styles.changeText}>{formatKgChange(change)} in 7 days</Text>
              </View>
            ) : null}
          </View>
          {goal ? (
            <>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(goal.doneKg / goal.totalKg) * 100}%` }]} />
              </View>
              <Text style={styles.muted}>
                {goal.doneKg.toFixed(1)} of {goal.totalKg.toFixed(1)} kg towards your goal
              </Text>
            </>
          ) : null}
        </>
      ) : (
        <Text style={styles.muted}>Log your first weigh-in to follow your progress.</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  date: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  greeting: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primarySoft,
  },
  chipText: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  todayCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  todayTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  ringValue: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
  },
  ringCaption: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  todayRows: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  todayMessage: {
    color: theme.colors.muted,
    lineHeight: 20,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pointsText: {
    flex: 1,
  },
  pointsLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  pointsDetail: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  pointsValue: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  pointsMax: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  weekText: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: '600',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  link: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  muted: {
    color: theme.colors.muted,
    lineHeight: 20,
  },
  path: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pathLine: {
    position: 'absolute',
    top: 18,
    left: '12%',
    right: '12%',
    height: 2,
    backgroundColor: theme.colors.border,
  },
  pathStop: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  pathNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondarySurface,
    borderWidth: 2,
    borderColor: theme.colors.secondarySurface,
  },
  pathNodeDone: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pathNodeNext: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary,
  },
  pathLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  pathLabelNext: {
    color: theme.colors.primary,
  },
  pathKcal: {
    color: theme.colors.muted,
    fontSize: 11,
  },
  nextMeal: {
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    gap: 4,
  },
  nextLabel: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  nextName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 22,
  },
  nextMacros: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  eatButton: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primary,
  },
  eatButtonText: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  allDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.primarySoft,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
  },
  allDoneText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  kcalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  kcalValue: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  track: {
    height: 8,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.secondarySurface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primary,
  },
  tiles: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  tile: {
    flex: 1,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.md,
    gap: 2,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  tileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  tileValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  tileTarget: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  tileTrack: {
    marginVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  tileAction: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.surface,
  },
  tileActionText: {
    fontWeight: '800',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  weightValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  changeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.secondarySurface,
  },
  changeText: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  notice: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});
