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
import { t } from '../i18n';
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
      showDialog({ title: t('common.errors.saveAnswersTitle'), message: t('common.errors.checkConnection'), tone: 'danger' });
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

    showDialog({
      title: t('onboarding.startDate.reset.title'),
      message: points === null ? t('onboarding.startDate.reset.messageUnknown') : t('onboarding.startDate.reset.message', { count: points }),
      icon: 'refresh-outline',
      buttons: [
        { text: t('onboarding.startDate.reset.confirm'), style: 'destructive', onPress: createPlan },
        { text: t('onboarding.startDate.reset.swapInstead'), onPress: () => leaveOnboarding('DietPlan') },
        { text: t('common.actions.cancel'), style: 'cancel' },
      ],
    });
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title={t('onboarding.startDate.title')}
        subtitle={t('onboarding.startDate.subtitle')}
      />
      <StartDatePicker firstDate={today} onChange={setStartDate} value={startDate} />
      {hasPlan ? (
        <AppCard style={styles.notice}>
          <Text style={styles.noticeText}>
            {isRunning
              ? t('onboarding.startDate.replaceRunning')
              : t('onboarding.startDate.replaceUpcoming')}
          </Text>
        </AppCard>
      ) : null}
      <AppButton title={t('onboarding.startDate.create')} loading={isSaving} onPress={handleCreate} />
      {isRestarting ? (
        <AppButton
          title={hasPlan ? t('onboarding.startDate.keepCurrent') : t('common.actions.notNow')}
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
