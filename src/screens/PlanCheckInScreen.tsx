import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { StartDatePicker } from '../components/StartDatePicker';
import { getHealthNotice } from '../constants/health';
import { showDialog } from '../features/dialog/dialogStore';
import { getGenerationDetail, isGenerationCancelled } from '../features/dietPlan/planGeneration';
import { useCancelGeneration } from '../features/dietPlan/useCancelGeneration';
import { AppStackParamList } from '../navigation/navigationTypes';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useProgressStore } from '../store/useProgressStore';
import { t, translatedOption } from '../i18n';
import { theme } from '../theme/theme';
import { PlanEffort, PlanMealChoice } from '../types/models';

type Props = NativeStackScreenProps<AppStackParamList, 'PlanCheckIn'>;

const EFFORT_OPTIONS: { readonly label: string; value: PlanEffort }[] = [
  translatedOption<PlanEffort>('too_hard', 'dietPlan.checkIn.effort.too_hard'),
  translatedOption<PlanEffort>('about_right', 'dietPlan.checkIn.effort.about_right'),
  translatedOption<PlanEffort>('too_easy', 'dietPlan.checkIn.effort.too_easy'),
];

const MEAL_CHOICE_OPTIONS: { readonly label: string; value: PlanMealChoice }[] = [
  translatedOption<PlanMealChoice>('keep_favourites', 'dietPlan.checkIn.mealChoice.keep_favourites'),
  translatedOption<PlanMealChoice>('start_fresh', 'dietPlan.checkIn.mealChoice.start_fresh'),
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
  const { confirmCancel, isCancelling } = useCancelGeneration(isSubmitting);

  const handleSubmit = async () => {
    const weightKg = parseFloat(weight);
    if (weight !== '' && (isNaN(weightKg) || weightKg <= 0)) {
      showDialog({ title: t('dietPlan.checkIn.checkWeightTitle'), message: t('dietPlan.checkIn.checkWeightMessage'), icon: 'scale-outline' });
      return;
    }

    setIsSubmitting(true);
    try {
      // The weight goes first because the next plan is built from the latest one.
      if (weight !== '' && !(await addWeightLog(weightKg, t('dietPlan.checkIn.weightNote')))) {
        showDialog({ title: t('common.errors.title'), message: t('dietPlan.checkIn.weightFailed'), tone: 'danger' });
        return;
      }

      await renewActivePlan({ startDate, effort, mealChoice });
      if (navigation.isFocused()) {
        navigation.goBack();
      }
    } catch (e) {
      // Cancelled, so the answers stay here to change and send again.
      if (isGenerationCancelled(e)) {
        return;
      }
      showDialog({ title: t('common.errors.title'), message: e instanceof Error ? e.message : t('dietPlan.checkIn.createFailed'), tone: 'danger' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <SectionHeader
        title={t('dietPlan.checkIn.title')}
        subtitle={t('dietPlan.checkIn.subtitle')}
      />

      <AppTextInput
        keyboardType="numeric"
        label={t('dietPlan.checkIn.weight')}
        onChangeText={setWeight}
        placeholder={t('dietPlan.checkIn.weightPlaceholder')}
        value={weight}
      />

      <View style={styles.question}>
        <Text style={styles.label}>{t('dietPlan.checkIn.feel')}</Text>
        <SegmentedControl onChange={setEffort} options={EFFORT_OPTIONS} value={effort} />
      </View>

      <View style={styles.question}>
        <Text style={styles.label}>{t('dietPlan.checkIn.nextMeals')}</Text>
        <SegmentedControl onChange={setMealChoice} options={MEAL_CHOICE_OPTIONS} value={mealChoice} />
        <Text style={styles.hint}>
          {mealChoice === 'keep_favourites'
            ? t('dietPlan.checkIn.keepHint')
            : t('dietPlan.checkIn.freshHint')}
        </Text>
      </View>

      <View style={styles.question}>
        <Text style={styles.label}>{t('dietPlan.checkIn.startOn')}</Text>
        <StartDatePicker firstDate={earliestStartDate} onChange={setStartDate} value={startDate} />
      </View>

      <AppButton loading={isSubmitting} onPress={handleSubmit} title={t('dietPlan.checkIn.create')} />
      {isSubmitting ? (
        <>
          <Text style={styles.hint}>{getGenerationDetail()}</Text>
          <AppButton loading={isCancelling} onPress={confirmCancel} title={t('common.actions.cancel')} variant="ghost" />
        </>
      ) : null}
      <Text style={styles.notice}>{getHealthNotice()}</Text>
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
