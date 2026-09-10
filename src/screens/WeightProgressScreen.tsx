import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Dimensions, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { formatKg } from '../utils/formatters';

export function WeightProgressScreen() {
  const { entries, addWeightLog, removeWeightLog } = useProgressStore();
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

  const handleRemove = (id: string) => {
    Alert.alert(
      "Remove Weight Log",
      "Are you sure you want to remove this weight log?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeWeightLog(id) }
      ]
    );
  };

  // Get last 7 entries
  const chartEntries = entries.slice(-7);

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
            {entries.length > 1 ? (
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
            ) : entries.length === 1 ? (
              <View style={styles.singleEntryContainer}>
                <Text style={styles.singleEntryLabel}>Current weight</Text>
                <Text style={styles.singleEntryValue}>{formatKg(entries[0].weightKg)}</Text>
                <Text style={styles.singleEntryDate}>
                  Logged on {new Date(entries[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </Text>
                <Text style={styles.singleEntryHint}>Log one more weight to see your progress chart!</Text>
              </View>
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

          {entries.length > 0 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>History</Text>
              {[...entries].reverse().map((entry) => (
                <AppCard key={entry.id} style={styles.historyCard}>
                  <View>
                    <Text style={styles.historyWeight}>{formatKg(entry.weightKg)}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(entry.id)} style={styles.removeButton}>
                    <Ionicons name="trash-outline" size={24} color={theme.colors.danger} />
                  </TouchableOpacity>
                </AppCard>
              ))}
            </View>
          )}
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
  },
  singleEntryContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  singleEntryLabel: {
    fontSize: 16,
    color: theme.colors.muted,
  },
  singleEntryValue: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  singleEntryDate: {
    fontSize: 14,
    color: theme.colors.text,
  },
  singleEntryHint: {
    fontSize: 14,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  historyContainer: {
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.md,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  historyWeight: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  historyDate: {
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 2,
  },
  removeButton: {
    padding: theme.spacing.sm,
  }
});
