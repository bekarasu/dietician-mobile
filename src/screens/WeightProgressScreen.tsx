import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { formatKg } from '../utils/formatters';

export function WeightProgressScreen() {
  const { entries, addWeightLog } = useProgressStore();
  const [newWeight, setNewWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const weightVal = parseFloat(newWeight);
    if (isNaN(weightVal) || weightVal <= 0) return;

    setIsSubmitting(true);
    await addWeightLog(weightVal, 'Logged from Progress Screen');
    setNewWeight('');
    setIsSubmitting(false);
  };

  // Get last 5 entries
  const lastEntries = entries.slice(-7);

  // If there's only 1 entry, duplicate it for the previous day so we get a flat line instead of a crash/weird rendering
  const chartEntries = lastEntries.length === 1
    ? [
      { ...lastEntries[0], date: new Date(new Date(lastEntries[0].date).getTime() - 86400000).toISOString() },
      lastEntries[0]
    ]
    : lastEntries;

  const chartData = {
    labels: chartEntries.map(e => new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })),
    datasets: [
      {
        data: chartEntries.map(e => e.weightKg),
        color: (opacity = 1) => theme.colors.primary,
        strokeWidth: 2,
      }
    ]
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SectionHeader
            title="Weight Progress"
            subtitle="Track your weight over time and stay consistent with your goals."
          />

          <AppCard style={styles.chartCard}>
            {entries.length > 0 ? (
              <LineChart
                data={chartData}
                width={screenWidth - theme.spacing.lg * 4}
                height={220}
                yAxisSuffix="kg"
                chartConfig={{
                  backgroundColor: theme.colors.surface,
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: theme.colors.primary
                  }
                }}
                bezier
                style={styles.chart}
              />
            ) : (
              <Text style={styles.emptyText}>No weight logs yet. Start by entering your current weight below.</Text>
            )}
          </AppCard>

          <AppCard style={styles.formCard}>
            <Text style={styles.formTitle}>Log New Weight</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="e.g. 75"
                keyboardType="numeric"
                value={newWeight}
                onChangeText={setNewWeight}
                editable={!isSubmitting}
              />
              <Text style={styles.unit}>kg</Text>
            </View>
            <AppButton
              title={isSubmitting ? "Saving..." : "Save Weight"}
              onPress={handleSubmit}
              disabled={isSubmitting || !newWeight}
            />
          </AppCard>
        </ScrollView>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  chartCard: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  emptyText: {
    color: theme.colors.muted,
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  formCard: {
    gap: theme.spacing.md,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  unit: {
    color: theme.colors.muted,
    fontSize: 16,
    fontWeight: '500',
  }
});
