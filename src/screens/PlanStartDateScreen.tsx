import { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { StartDatePicker } from '../components/StartDatePicker';
import { showDialog } from '../features/dialog/dialogStore';
import { getPlanSchedule } from '../features/dietPlan/planSchedule';
import { OnboardingStackParamList } from '../navigation/navigationTypes';
import { leaderboardService } from '../services/leaderboardService';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { theme } from '../theme/theme';
import { ActivityDay } from '../types/models';
import { toCalendarDate } from '../utils/date';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'PlanStartDate'>;

// The points this week that a new plan starting on startDate takes away: every
// earlier day's, which the server resets, and today's if the plan starts later,
// because today then has no plan.
function getPointsToReset(days: ActivityDay[], today: string, startDate: string) {
  return days
    .filter((day) => day.date < today || (day.date === today && startDate > today))
    .reduce((total, day) => total + day.points, 0);
}

export function PlanStartDateScreen({ navigation }: Props) {
  const [today] = useState(() => toCalendarDate(new Date()));
  const [startDate, setStartDate] = useState(today);
  // Set when onboarding was restarted with a plan in place, which the new one replaces.
  const activePlan = useDietPlanStore((state) => state.activePlan);
  const hasPlan = activePlan !== null;
  // Replacing a running plan resets the plan points earned earlier this week.
  const isRunning = activePlan !== null && getPlanSchedule(activePlan).phase === 'running';
  // This week's days, null until they load or if they can't be.
  const [weekDays, setWeekDays] = useState<ActivityDay[] | null>(null);
  // Nothing is saved before the plan is created, so leaving here changes nothing.
  const isRestarting = useOnboardingStore((state) => state.isRestarting);
  const leaveOnboarding = useOnboardingStore((state) => state.leaveOnboarding);
  const saveAnswers = useOnboardingStore((state) => state.saveAnswers);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    let isMounted = true;
    leaderboardService
      .getWeekActivity()
      .then((activity) => {
        if (isMounted) setWeekDays(activity.days);
      })
      // Unknown points get the general warning instead.
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [isRunning]);

  // The answers are saved only now, for the plan built from them. Cancelling it,
  // or leaving after it fails, puts the profile back as it was.
  const createPlan = async () => {
    setIsSaving(true);
    try {
      await saveAnswers();
      navigation.navigate('GeneratingDietPlan', { startDate });
    } catch (error) {
      console.error('Failed to save onboarding answers', error);
      showDialog({ title: "We couldn't save your answers", message: 'Check your connection and try again.', tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = () => {
    const points = weekDays ? getPointsToReset(weekDays, today, startDate) : null;
    if (!isRunning || points === 0) {
      createPlan();
      return;
    }

    const earned = points === null ? 'the points' : `the ${points} ${points === 1 ? 'point' : 'points'}`;
    showDialog({
      title: "Reset this week's points?",
      message: `A new plan resets ${earned} you've earned from your plan this week to zero, and those days still count towards your weekly average. If some meals don't suit you, you can swap them in your current plan instead.`,
      icon: 'refresh-outline',
      buttons: [
        { text: 'Reset and continue', style: 'destructive', onPress: createPlan },
        { text: 'Swap meals instead', onPress: () => leaveOnboarding('DietPlan') },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title="When do you want to start?"
        subtitle="Pick a day you'll have time to shop for. Your meals and leaderboard score count from that day."
      />
      <StartDatePicker firstDate={today} onChange={setStartDate} value={startDate} />
      {hasPlan ? (
        <AppCard style={styles.notice}>
          <Text style={styles.noticeText}>
            {isRunning
              ? "Your new plan replaces your current one from today. Meal, water and coffee points you've earned this week are reset, and days before the new plan starts aren't scored."
              : "Your new plan replaces your current one. Points you've already earned stay, and days before the new plan starts aren't scored."}
          </Text>
        </AppCard>
      ) : null}
      <AppButton title="Create My Plan" loading={isSaving} onPress={handleCreate} />
      {isRestarting ? (
        <AppButton
          title={hasPlan ? 'Keep my current plan' : 'Not now'}
          variant="ghost"
          disabled={isSaving}
          onPress={() => leaveOnboarding()}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: theme.colors.secondarySurface,
  },
  noticeText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
});
