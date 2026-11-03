import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { StartDatePicker } from '../components/StartDatePicker';
import { HEALTH_NOTICE } from '../constants/health';
import { AppStackParamList } from '../navigation/navigationTypes';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';
import { PlanEffort, PlanMealChoice } from '../types/models';

type Props = NativeStackScreenProps<AppStackParamList, 'PlanCheckIn'>;

const EFFORT_OPTIONS: { label: string; value: PlanEffort }[] = [
  { label: 'Too hard', value: 'too_hard' },
  { label: 'About right', value: 'about_right' },
  { label: 'Too easy', value: 'too_easy' },
];

const MEAL_CHOICE_OPTIONS: { label: string; value: PlanMealChoice }[] = [
  { label: 'Keep favourites', value: 'keep_favourites' },
  { label: 'Start fresh', value: 'start_fresh' },
];

export function PlanCheckInScreen({ navigation, route }: Props) {
  const { earliestStartDate } = route.params;
  const renewActivePlan = useDietPlanStore((state) => state.renewActivePlan);
  const addWeightLog = useProgressStore((state) => state.addWeightLog);

  const [weight, setWeight] = useState('');
  const [effort, setEffort] = useState<PlanEffort>('about_right');
  const [mealChoice, setMealChoice] = useState<PlanMealChoice>('keep_favourites');
  const [startDate, setStartDate] = useState(earliestStartDate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const weightKg = parseFloat(weight);
    if (weight !== '' && (isNaN(weightKg) || weightKg <= 0)) {
      Alert.alert('Check your weight', 'Enter your weight in kilograms, or leave it empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      // The weight goes first because the next plan is built from the latest one.
      if (weight !== '' && !(await addWeightLog(weightKg, 'Logged from plan check-in'))) {
        Alert.alert('Error', 'We couldn\'t save your weight. Please try again.');
        return;
      }

      await renewActivePlan({ startDate, effort, mealChoice });
      if (navigation.isFocused()) {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'We couldn\'t create your next plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <SectionHeader
        title="How did this plan go?"
        subtitle="Your answers and the meals you logged shape your next plan."
      />

      <AppTextInput
        keyboardType="numeric"
        label="Weight today (optional)"
        onChangeText={setWeight}
        placeholder="e.g. 72.5"
        value={weight}
      />

      <View style={styles.question}>
        <Text style={styles.label}>How did the plan feel?</Text>
        <SegmentedControl onChange={setEffort} options={EFFORT_OPTIONS} value={effort} />
      </View>

      <View style={styles.question}>
        <Text style={styles.label}>Your next meals</Text>
        <SegmentedControl onChange={setMealChoice} options={MEAL_CHOICE_OPTIONS} value={mealChoice} />
        <Text style={styles.hint}>
          {mealChoice === 'keep_favourites'
            ? 'We\'ll bring back meals you marked as taken and add some new ones.'
            : 'Every meal will be new.'}
        </Text>
      </View>

      <View style={styles.question}>
        <Text style={styles.label}>Start your next plan on</Text>
        <StartDatePicker firstDate={earliestStartDate} onChange={setStartDate} value={startDate} />
      </View>

      <AppButton loading={isSubmitting} onPress={handleSubmit} title="Create My Next Plan" />
      {isSubmitting ? <Text style={styles.hint}>This can take a minute.</Text> : null}
      <Text style={styles.notice}>{HEALTH_NOTICE}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  question: {
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  hint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  notice: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    textAlign: 'center',
  },
});
