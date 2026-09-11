import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { AppCard } from '../components/AppCard';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { progressService } from '../services/progressService';
import { useHydrationStore } from '../store/useHydrationStore';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { formatDateLabel } from '../utils/date';
import { formatKg } from '../utils/formatters';

const screenWidth = Dimensions.get('window').width - theme.spacing.lg * 2;

export function ProgressDashboardScreen() {
  const [activeTab, setActiveTab] = useState<'progress' | 'hydration'>('progress');
  const entries = useProgressStore((state) => state.entries);
  const latestEntry = useProgressStore((state) => state.latestEntry());
  const previousEntry = entries.length > 1 ? entries[entries.length - 2] : undefined;
  const weightDelta = latestEntry && previousEntry ? latestEntry.weightKg - previousEntry.weightKg : 0;

  const [weeklyLogs, setWeeklyLogs] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const rawDailyLog = useHydrationStore((state) => state.rawDailyLog);

  useEffect(() => {
    const fetchWeeklyLogs = async () => {
      const logs = await progressService.getWeeklyDailyLogs(selectedDate);
      setWeeklyLogs(logs);
    };
    fetchWeeklyLogs();
  }, [selectedDate, rawDailyLog]);

  const handlePreviousWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const renderProgressTab = () => (
    <View style={styles.tabContent}>

      <View style={styles.metricsRow}>
        <AppCard style={styles.metricCard}>
          <Text style={styles.metricLabel}>Current weight</Text>
          <Text style={styles.metricValue}>{latestEntry ? formatKg(latestEntry.weightKg) : '--'}</Text>
        </AppCard>
        <AppCard style={styles.metricCard}>
          <Text style={styles.metricLabel}>Week delta</Text>
          <Text style={styles.metricValue}>{weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg</Text>
        </AppCard>
      </View>

      <AppCard style={styles.stack}>
        <ProgressBar label="Weekly consistency" current={latestEntry?.weeklyConsistency ?? 0} target={100} suffix="%" />
        <ProgressBar label="Goal progress" current={latestEntry?.goalProgress ?? 0} target={100} suffix="%" />
      </AppCard>

      {[...entries].reverse().map((entry) => (
        <AppCard key={entry.id} style={styles.entryCard}>
          <View style={styles.entryHeader}>
            <Text style={styles.entryDate}>{formatDateLabel(entry.date)}</Text>
            <Text style={styles.entryWeight}>{formatKg(entry.weightKg)}</Text>
          </View>
          <Text style={styles.entryMeta}>Consistency {entry.weeklyConsistency}% · Goal progress {entry.goalProgress}%</Text>
          {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
        </AppCard>
      ))}
    </View>
  );

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
        subtitle="Track your weight progress and hydration history."
      />

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'progress' && styles.tabButtonActive]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.tabText, activeTab === 'progress' && styles.tabTextActive]}>Weight</Text>
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
  stack: {
    gap: theme.spacing.lg,
  },
  entryCard: {
    gap: theme.spacing.sm,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  entryDate: {
    color: theme.colors.muted,
  },
  entryWeight: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  entryMeta: {
    color: theme.colors.text,
  },
  entryNote: {
    color: theme.colors.muted,
    lineHeight: 22,
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