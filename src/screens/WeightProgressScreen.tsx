import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { showDialog } from '../features/dialog/dialogStore';
import { getGoalProgress, getWeeklyChange } from '../features/progress/progressSummary';
import { WeightTrendChart } from '../features/progress/WeightTrendChart';
import { useProfileStore } from '../store/useProfileStore';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { ProgressEntry } from '../types/models';
import { formatDateTimeLabel } from '../utils/date';
import { formatKg, formatKgChange } from '../utils/formatters';

const HISTORY_PREVIEW = 10;

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function WeightProgressScreen() {
  const entries = useProgressStore((state) => state.entries);
  const addWeightLog = useProgressStore((state) => state.addWeightLog);
  const removeWeightLog = useProgressStore((state) => state.removeWeightLog);
  const targetWeightKg = useProfileStore((state) => state.profile?.targetWeightKg);

  const [weight, setWeight] = useState('');
  const [weightError, setWeightError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const first = entries[0];
  const latest = entries[entries.length - 1];
  const weeklyChange = getWeeklyChange(entries);
  const goal = getGoalProgress(entries, targetWeightKg);
  // Newest first.
  const history = [...entries].reverse();
  const shownHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW);

  const save = async () => {
    // Number() rejects input like 7.2.5, which parseFloat would read as 7.2.
    const weightKg = Number(weight);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      setWeightError('Enter your weight in kilograms.');
      return;
    }

    setIsSaving(true);
    const saved = await addWeightLog(weightKg, 'Logged from Progress Screen');
    setIsSaving(false);
    if (!saved) {
      showDialog({ title: 'Error', message: 'We couldn\'t save your weigh-in. Please try again.', tone: 'danger' });
      return;
    }
    setWeight('');
    Keyboard.dismiss();
  };

  const remove = async (id: string) => {
    if (!(await removeWeightLog(id))) {
      showDialog({ title: 'Error', message: 'We couldn\'t remove this weigh-in. Please try again.', tone: 'danger' });
    }
  };

  const confirmRemove = (entry: ProgressEntry) => {
    showDialog({
      title: 'Remove weigh-in',
      message: `Remove ${formatKg(entry.weightKg)} from ${formatDateTimeLabel(entry.date)}?`,
      icon: 'trash-outline',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => remove(entry.id) },
      ],
    });
  };

  return (
    <ScreenContainer scrollViewProps={{ keyboardShouldPersistTaps: 'handled', automaticallyAdjustKeyboardInsets: true }}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Current weight</Text>
        {latest ? (
          <>
            <View style={styles.weightRow}>
              <Text style={styles.weightValue}>{formatKg(latest.weightKg)}</Text>
              {weeklyChange !== null ? (
                <View style={styles.changeChip}>
                  <Text style={styles.changeText}>{formatKgChange(weeklyChange)} in 7 days</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.caption}>Last weighed {formatDateTimeLabel(latest.date)}</Text>

            <View style={styles.stats}>
              <Stat label="Starting" value={formatKg(first.weightKg)} />
              <View style={styles.statDivider} />
              <Stat label="Change" value={formatKgChange(latest.weightKg - first.weightKg)} />
              <View style={styles.statDivider} />
              <Stat label="Target" value={targetWeightKg ? formatKg(targetWeightKg) : '--'} />
            </View>

            {goal ? (
              <View style={styles.goal}>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${(goal.doneKg / goal.totalKg) * 100}%` }]} />
                </View>
                <Text style={styles.caption}>
                  {goal.doneKg.toFixed(1)} of {goal.totalKg.toFixed(1)} kg towards your goal
                </Text>
              </View>
            ) : null}
            {!targetWeightKg ? (
              <Text style={styles.caption}>Set a target weight in your profile to follow your goal progress.</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.muted}>No weigh-ins yet. Log your weight below to start following your progress.</Text>
        )}
      </View>

      <View style={styles.card}>
        <View>
          <Text style={styles.cardTitle}>Log a weigh-in</Text>
          <Text style={styles.cardCaption}>
            Weigh-ins count towards your week's weight points. Weighing at the same time of day keeps readings comparable.
          </Text>
        </View>
        <AppTextInput
          editable={!isSaving}
          error={weightError}
          inputMode="decimal"
          label="Weight"
          onChangeText={(text) => {
            setWeight(text);
            setWeightError(undefined);
          }}
          placeholder={latest ? latest.weightKg.toFixed(1) : 'e.g. 72.5'}
          suffix="kg"
          value={weight}
        />
        <AppButton disabled={!weight} loading={isSaving} onPress={save} title="Save weigh-in" />
      </View>

      {entries.length > 1 ? (
        <View style={styles.card}>
          <WeightTrendChart entries={entries} />
        </View>
      ) : entries.length === 1 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trend</Text>
          <Text style={styles.muted}>Log one more weigh-in to see your trend.</Text>
        </View>
      ) : null}

      {history.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>History</Text>
          <View style={styles.list}>
            {shownHistory.map((entry, index) => {
              const previous = history[index + 1];
              const change = previous ? entry.weightKg - previous.weightKg : null;
              const isLast = index === shownHistory.length - 1;

              return (
                <View key={entry.id} style={[styles.historyRow, isLast && styles.historyRowLast]}>
                  <View style={styles.historyIcon}>
                    <Ionicons name="scale-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.historyText}>
                    <Text style={styles.historyWeight}>{formatKg(entry.weightKg)}</Text>
                    <Text style={styles.caption}>{formatDateTimeLabel(entry.date)}</Text>
                  </View>
                  {change !== null ? (
                    <View style={styles.changeChip}>
                      <Text style={styles.changeText}>{formatKgChange(change)}</Text>
                    </View>
                  ) : null}
                  <Pressable
                    accessibilityLabel={`Remove ${formatKg(entry.weightKg)} from ${formatDateTimeLabel(entry.date)}`}
                    accessibilityRole="button"
                    hitSlop={theme.spacing.sm}
                    onPress={() => confirmRemove(entry)}
                    style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.muted} />
                  </Pressable>
                </View>
              );
            })}
          </View>
          {history.length > HISTORY_PREVIEW ? (
            <Pressable accessibilityRole="button" onPress={() => setShowAllHistory((shown) => !shown)} style={styles.moreButton}>
              <Text style={styles.link}>{showAllHistory ? 'Show fewer' : `Show all ${history.length} weigh-ins`}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  eyebrow: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  weightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: -theme.spacing.sm,
  },
  weightValue: {
    color: theme.colors.text,
    fontSize: theme.typography.hero.fontSize,
    fontWeight: '800',
    lineHeight: theme.typography.hero.lineHeight,
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
  caption: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
  },
  muted: {
    color: theme.colors.muted,
    lineHeight: 20,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.secondarySurface,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.border,
  },
  goal: {
    gap: theme.spacing.xs,
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
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardCaption: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    marginTop: 2,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: -theme.spacing.sm,
  },
  list: {
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingLeft: theme.spacing.lg,
    paddingRight: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  historyRowLast: {
    borderBottomWidth: 0,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  historyText: {
    flex: 1,
    gap: 2,
  },
  historyWeight: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  removeButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.radii.round,
  },
  pressed: {
    backgroundColor: theme.colors.secondarySurface,
  },
  moreButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
