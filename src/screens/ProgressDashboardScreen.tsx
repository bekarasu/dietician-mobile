import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { AppCard } from '../components/AppCard';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { getStatusMessage } from '../features/leaderboard/scoreMessages';
import {
  getActivityDetail,
  getActivityReason,
  getActivityTitle,
  getGoalProgress,
  getWeeklyChange,
} from '../features/progress/progressSummary';
import { AppStackParamList } from '../navigation/navigationTypes';
import { leaderboardService } from '../services/leaderboardService';
import { progressService } from '../services/progressService';
import { useHydrationStore } from '../store/useHydrationStore';
import { useProfileStore } from '../store/useProfileStore';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { Activity, ActivityDay, WeekActivity } from '../types/models';
import { addCalendarDays, formatCalendarDate, formatTime, formatWeekRange, toCalendarDate } from '../utils/date';
import { formatKg, formatKgChange } from '../utils/formatters';

const screenWidth = Dimensions.get('window').width - theme.spacing.lg * 2;

function getDayLabel(date: string) {
  const today = toCalendarDate(new Date());
  if (date === today) {
    return 'Today';
  }
  if (date === addCalendarDays(today, -1)) {
    return 'Yesterday';
  }
  return formatCalendarDate(date);
}

function ActivityRow({ activity, isCounted }: { activity: Activity; isCounted: boolean }) {
  const detail = getActivityDetail(activity);
  const reason = isCounted ? getActivityReason(activity) : null;

  // A weigh-in counts towards the week's weight points, and a day that wasn't
  // scored earns nothing, so neither shows points of its own.
  let points: string | null = null;
  if (isCounted && activity.points !== null) {
    points = activity.points > 0 ? `+${activity.points}` : '0';
  }

  return (
    <View style={styles.activityRow}>
      <Text style={styles.activityTime}>{activity.loggedAt ? formatTime(activity.loggedAt) : 'Day total'}</Text>
      <View style={styles.activityText}>
        <Text style={styles.activityTitle}>
          {getActivityTitle(activity)}
          {detail ? <Text style={styles.activityDetail}> · {detail}</Text> : null}
        </Text>
        {reason ? <Text style={styles.activityReason}>{reason}</Text> : null}
      </View>
      {points ? (
        <Text style={[styles.activityPoints, activity.points === 0 && styles.activityPointsNone]}>{points}</Text>
      ) : null}
    </View>
  );
}

function DayHistory({ day }: { day: ActivityDay }) {
  const isCounted = day.status === 'SCORED' || day.status === 'IN_PROGRESS';

  let summary = 'Not scored';
  if (isCounted) {
    summary = `${day.points} / ${day.maxPoints}${day.status === 'IN_PROGRESS' ? ' so far' : ''}`;
  }

  let empty: string | null = null;
  if (day.activities.length === 0) {
    empty = day.status === 'IN_PROGRESS' ? 'Nothing logged yet.' : 'Nothing logged.';
  }

  return (
    <View style={styles.day}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>{getDayLabel(day.date)}</Text>
        <Text style={[styles.daySummary, !isCounted && styles.daySummaryMuted]}>{summary}</Text>
      </View>
      {/* Week-wide reasons are shown once, on the week. */}
      {day.statusReason === 'no_plan_on_day' ? <Text style={styles.activityReason}>{getStatusMessage(day.statusReason)}</Text> : null}
      {empty ? <Text style={styles.activityReason}>{empty}</Text> : null}
      {day.activities.map((activity, index) => (
        <ActivityRow key={`${activity.type}-${activity.loggedAt ?? ''}-${index}`} activity={activity} isCounted={isCounted} />
      ))}
    </View>
  );
}

function WeekHistory({ activity, isCurrent, onOpen }: { activity: WeekActivity; isCurrent: boolean; onOpen: () => void }) {
  const { week, finalized } = activity;
  // Days before the plan with nothing logged would only be noise.
  const days = activity.days.filter((day) => day.activities.length > 0 || day.status !== 'NOT_SCORED');

  let label = formatWeekRange(week.periodStart, week.periodEndExclusive);
  if (isCurrent) {
    label = `This week · ${label}`;
  }

  return (
    <AppCard style={styles.weekCard}>
      <Pressable onPress={onOpen} style={styles.weekHeader}>
        <View style={styles.weekHeaderText}>
          <Text style={styles.weekTitle}>{label}</Text>
          {week.totalScore !== null ? (
            <Text style={styles.weekSplit}>
              Weight {week.weightPoints} · Meals {week.mealPoints} · Water {week.waterPoints} · Coffee {week.coffeePoints}
            </Text>
          ) : (
            <Text style={styles.weekSplit}>{getStatusMessage(week.statusReason)}</Text>
          )}
        </View>
        <View style={styles.weekScore}>
          <Text style={styles.weekScoreValue}>{week.totalScore ?? '–'}</Text>
          {week.totalScore !== null ? (
            <Text style={styles.weekScoreLabel}>{finalized ? 'final' : isCurrent ? 'so far' : 'score'}</Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      </Pressable>
      {days.length === 0 ? <Text style={styles.activityReason}>Nothing logged this week.</Text> : null}
      {days.map((day) => (
        <DayHistory key={day.date} day={day} />
      ))}
    </AppCard>
  );
}

export function ProgressDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [activeTab, setActiveTab] = useState<'progress' | 'hydration'>('progress');
  const entries = useProgressStore((state) => state.entries);
  const latestEntry = useProgressStore((state) => state.latestEntry());
  const targetWeightKg = useProfileStore((state) => state.profile?.targetWeightKg);
  const weeklyChange = getWeeklyChange(entries);
  const goalProgress = getGoalProgress(entries, targetWeightKg);

  // Newest week first. The first is always the current week.
  const [weeks, setWeeks] = useState<WeekActivity[]>([]);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [earlierFailed, setEarlierFailed] = useState(false);
  const currentRequest = useRef(0);

  const [weeklyLogs, setWeeklyLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => toCalendarDate(new Date()));
  const rawDailyLog = useHydrationStore((state) => state.rawDailyLog);

  // Earlier weeks rarely change, so only the current one is refreshed. A new
  // week starting drops the rest, so the list never skips a week.
  const loadCurrentWeek = useCallback(async () => {
    const request = ++currentRequest.current;
    try {
      const current = await leaderboardService.getWeekActivity();
      if (request !== currentRequest.current) {
        return;
      }
      setWeeks((loaded) => (loaded[0]?.week.periodStart === current.week.periodStart ? [current, ...loaded.slice(1)] : [current]));
      setHistoryFailed(false);
    } catch (e) {
      if (request === currentRequest.current) {
        setHistoryFailed(true);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCurrentWeek();
    }, [loadCurrentWeek]),
  );

  const loadEarlierWeek = async () => {
    const oldest = weeks[weeks.length - 1];
    if (!oldest?.previousPeriodStart || isLoadingEarlier) {
      return;
    }
    setIsLoadingEarlier(true);
    setEarlierFailed(false);
    try {
      const earlier = await leaderboardService.getWeekActivity(oldest.previousPeriodStart);
      setWeeks((loaded) => (loaded[loaded.length - 1]?.week.periodStart === oldest.week.periodStart ? [...loaded, earlier] : loaded));
    } catch (e) {
      setEarlierFailed(true);
    } finally {
      setIsLoadingEarlier(false);
    }
  };

  const openWeek = (periodStart: string) => {
    navigation.navigate('ScoreBreakdown', { period: 'weekly', periodStart });
  };

  useEffect(() => {
    const fetchWeeklyLogs = async () => {
      const logs = await progressService.getWeeklyDailyLogs(selectedDate);
      setWeeklyLogs(logs);
    };
    fetchWeeklyLogs();
  }, [selectedDate, rawDailyLog]);

  const handlePreviousWeek = () => {
    setSelectedDate((date) => addCalendarDays(date, -7));
  };

  const handleNextWeek = () => {
    setSelectedDate((date) => addCalendarDays(date, 7));
  };

  const renderProgressTab = () => {
    const currentWeek = weeks[0];
    const consistency = currentWeek?.consistency ?? null;
    const oldest = weeks[weeks.length - 1];

    return (
      <View style={styles.tabContent}>
        <View style={styles.metricsRow}>
          <AppCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Current weight</Text>
            <Text style={styles.metricValue}>{latestEntry ? formatKg(latestEntry.weightKg) : '--'}</Text>
          </AppCard>
          <AppCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>Last 7 days</Text>
            <Text style={styles.metricValue}>{weeklyChange === null ? '--' : formatKgChange(weeklyChange)}</Text>
          </AppCard>
        </View>

        <AppCard style={styles.stack}>
          {consistency !== null ? (
            <ProgressBar label="Weekly consistency" current={Math.round(consistency)} target={100} suffix="%" />
          ) : (
            <View style={styles.emptyMetric}>
              <Text style={styles.emptyMetricLabel}>Weekly consistency</Text>
              <Text style={styles.emptyMetricValue}>--</Text>
            </View>
          )}
          <Text style={styles.metricHint}>
            {consistency !== null || !currentWeek
              ? 'The share of this week\'s meal, water and coffee points you\'ve earned so far.'
              : getStatusMessage(currentWeek.week.statusReason)}
          </Text>
          {goalProgress ? (
            <ProgressBar label="Goal progress" current={goalProgress.doneKg} target={goalProgress.totalKg} suffix=" kg" />
          ) : (
            <View style={styles.emptyMetric}>
              <Text style={styles.emptyMetricLabel}>Goal progress</Text>
              <Text style={styles.emptyMetricValue}>{latestEntry ? 'Set a target weight' : 'Log your weight'}</Text>
            </View>
          )}
        </AppCard>

        <Text style={styles.sectionTitle}>History</Text>
        {historyFailed && weeks.length === 0 ? (
          <AppCard style={styles.stack}>
            <Text style={styles.activityReason}>Your history couldn't load. Check your connection and try again.</Text>
            <TouchableOpacity onPress={loadCurrentWeek}>
              <Text style={styles.linkText}>Try again</Text>
            </TouchableOpacity>
          </AppCard>
        ) : null}
        {!historyFailed && weeks.length === 0 ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {weeks.map((week, index) => (
          <WeekHistory
            key={week.week.periodStart}
            activity={week}
            isCurrent={index === 0}
            onOpen={() => openWeek(week.week.periodStart)}
          />
        ))}
        {weeks.length > 0 ? (
          <Text style={styles.metricHint}>
            Each day earns up to 45 points for meals, water and coffee, and a week's habit points are the average of its days.
            Weigh-ins count towards the week's weight points.
          </Text>
        ) : null}
        {oldest?.previousPeriodStart ? (
          <TouchableOpacity style={styles.earlierButton} onPress={loadEarlierWeek} disabled={isLoadingEarlier}>
            {isLoadingEarlier ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={styles.linkText}>{earlierFailed ? 'Couldn\'t load. Try again' : 'Show earlier week'}</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const renderHydrationTab = () => {
    const getDaysOfWeek = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);
      const day = date.getDay();
      const diff = day === 0 ? -6 : 1 - day;

      const startOfWeek = new Date(date);
      startOfWeek.setDate(date.getDate() + diff);

      const days = [];
      for (let i = 0; i < 7; i++) {
        const current = new Date(startOfWeek);
        current.setDate(startOfWeek.getDate() + i);
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        days.push(`${yyyy}-${mm}-${dd}`);
      }
      return days;
    };

    const weekDays = getDaysOfWeek(selectedDate);

    // Format data for react-native-chart-kit
    const formatChartDate = (dateString: string) => {
      const [y, m, d] = dateString.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      const today = new Date();
      if (date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
        return 'Today';
      }
      return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    };

    const hydrationLabels = weekDays.map(formatChartDate);
    const hydrationData = weekDays.map(dayStr => {
      const log = weeklyLogs.find(l => l.logDate && l.logDate.startsWith(dayStr));
      return log?.waterIntakeMl || 0;
    });

    const coffeeLabels = weekDays.map(formatChartDate);
    const coffeeData = weekDays.map(dayStr => {
      const log = weeklyLogs.find(l => l.logDate && l.logDate.startsWith(dayStr));
      return log?.coffeeCups || 0;
    });

    const chartConfig = {
      backgroundGradientFrom: theme.colors.surface,
      backgroundGradientFromOpacity: 0,
      backgroundGradientTo: theme.colors.surface,
      backgroundGradientToOpacity: 0,
      decimalPlaces: 0,
      color: (opacity = 1) => theme.colors.primary,
      labelColor: (opacity = 1) => theme.colors.muted,
      barPercentage: 0.5,
      fillShadowGradient: theme.colors.primary,
      fillShadowGradientOpacity: 1,
      propsForBackgroundLines: {
        strokeWidth: 0,
      },
    };

    const hydrationMax = Math.max(...hydrationData);
    const coffeeMax = Math.max(...coffeeData);

    const getSegments = (max: number) => {
      if (max <= 1) return 1;
      if (max === 2) return 2;
      if (max === 3) return 3;
      return 4;
    };

    const createYLabelFormatter = (max: number) => {
      return (val: string) => {
        if (max === 0) {
          // Return spaces to maintain chart padding but keep labels invisible
          return '   ';
        }
        return Math.round(Number(val)).toString();
      };
    };

    const formatShortDate = (dateString: string) => {
      const [y, m, d] = dateString.split('-');
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    };

    const weekRangeText = `${formatShortDate(weekDays[0])} - ${formatShortDate(weekDays[6])}`;

    return (
      <View style={styles.tabContent}>
        <View style={styles.weekSelector}>
          <TouchableOpacity onPress={handlePreviousWeek}>
            <Text style={styles.weekSelectorText}>{"<"} Prev</Text>
          </TouchableOpacity>
          <Text style={styles.weekRangeText}>{weekRangeText}</Text>
          <TouchableOpacity onPress={handleNextWeek}>
            <Text style={styles.weekSelectorText}>Next {">"}</Text>
          </TouchableOpacity>
        </View>

        <AppCard style={styles.chartCard}>
          <Text style={styles.chartTitle}>Water Intake (ml)</Text>
          <View>
            <BarChart
              data={{
                labels: hydrationLabels,
                datasets: [{ data: hydrationData }],
              }}
              segments={getSegments(hydrationMax)}
              width={screenWidth - theme.spacing.lg * 2} // Card padding compensation
              height={220}
              yAxisSuffix=""
              yAxisLabel=""
              fromZero={true}
              showBarTops={false}
              withInnerLines={false}
              chartConfig={{
                ...chartConfig,
                fillShadowGradient: theme.colors.primary,
                formatYLabel: createYLabelFormatter(hydrationMax),
              }}
              style={styles.chartStyle}
            />
            {hydrationMax === 0 && (
              <Text style={styles.emptyZeroLabel}>0</Text>
            )}
          </View>
        </AppCard>

        <AppCard style={styles.chartCard}>
          <Text style={styles.chartTitle}>Coffee Intake (cups)</Text>
          <View>
            <BarChart
              data={{
                labels: coffeeLabels,
                datasets: [{ data: coffeeData }],
              }}
              segments={getSegments(coffeeMax)}
              width={screenWidth - theme.spacing.lg * 2}
              height={220}
              yAxisSuffix=""
              yAxisLabel=""
              fromZero={true}
              showBarTops={false}
              withInnerLines={false}
              chartConfig={{
                ...chartConfig,
                fillShadowGradient: '#8B4513', // Brownish color for coffee
                color: (opacity = 1) => `rgba(139, 69, 19, ${opacity})`,
                formatYLabel: createYLabelFormatter(coffeeMax),
              }}
              style={styles.chartStyle}
            />
            {coffeeMax === 0 && (
              <Text style={styles.emptyZeroLabel}>0</Text>
            )}
          </View>
        </AppCard>
      </View>
    );
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title="Progress dashboard"
        subtitle="Your weight, your weekly consistency, and the points each thing you log earns."
      />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'progress' && styles.tabButtonActive]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.tabText, activeTab === 'progress' && styles.tabTextActive]}>Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'hydration' && styles.tabButtonActive]}
          onPress={() => setActiveTab('hydration')}
        >
          <Text style={[styles.tabText, activeTab === 'hydration' && styles.tabTextActive]}>Hydration</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'progress' ? renderProgressTab() : renderHydrationTab()}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '800',
  },
  metricHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
  },
  stack: {
    gap: theme.spacing.md,
  },
  emptyMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyMetricLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  emptyMetricValue: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  weekCard: {
    gap: theme.spacing.md,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  weekHeaderText: {
    flex: 1,
    gap: 2,
  },
  weekTitle: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  weekSplit: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
  },
  weekScore: {
    alignItems: 'flex-end',
  },
  weekScoreValue: {
    color: theme.colors.primary,
    fontSize: 22,
    fontWeight: '800',
  },
  weekScoreLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  day: {
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  daySummary: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  daySummaryMuted: {
    color: theme.colors.muted,
    fontWeight: '500',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  activityTime: {
    width: 64,
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 20,
  },
  activityText: {
    flex: 1,
  },
  activityTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  activityDetail: {
    color: theme.colors.muted,
    fontWeight: '500',
  },
  activityReason: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
  },
  activityPoints: {
    color: theme.colors.primary,
    fontWeight: '800',
    lineHeight: 20,
  },
  activityPointsNone: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  earlierButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  tabTextActive: {
    color: theme.colors.background,
  },
  tabContent: {
    gap: theme.spacing.lg,
  },
  chartCard: {
    gap: theme.spacing.md,
    // alignItems: 'center',
  },
  chartTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '700',
    alignSelf: 'flex-start',
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 12,
    marginLeft: -20, // Slightly shift left to balance the chart without breaking internal padding
  },
  weekSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  weekSelectorText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  weekRangeText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.typography.body.fontSize,
  },
  emptyZeroLabel: {
    position: 'absolute',
    bottom: 45, // Position just above the x-axis labels
    left: 10,   // Align with the Y-axis
    color: theme.colors.muted,
    fontSize: 12,
  },
});
