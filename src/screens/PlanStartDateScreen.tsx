import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { StartDatePicker } from '../components/StartDatePicker';
import { OnboardingStackParamList } from '../navigation/navigationTypes';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { theme } from '../theme/theme';
import { toCalendarDate } from '../utils/date';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'PlanStartDate'>;

export function PlanStartDateScreen({ navigation }: Props) {
  const [today] = useState(() => toCalendarDate(new Date()));
  const [startDate, setStartDate] = useState(today);
  // Set when onboarding was restarted with a plan in place, which the new one replaces.
  const hasPlan = useDietPlanStore((state) => state.activePlan !== null);

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
            Your new plan replaces your current one from today. Points you've already earned stay, and days before
            the new plan starts aren't scored.
          </Text>
        </AppCard>
      ) : null}
      <AppButton title="Create My Plan" onPress={() => navigation.navigate('GeneratingDietPlan', { startDate })} />
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
