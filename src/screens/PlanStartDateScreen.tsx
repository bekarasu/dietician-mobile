import { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { StartDatePicker } from '../components/StartDatePicker';
import { OnboardingStackParamList } from '../navigation/navigationTypes';
import { toCalendarDate } from '../utils/date';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'PlanStartDate'>;

export function PlanStartDateScreen({ navigation }: Props) {
  const [today] = useState(() => toCalendarDate(new Date()));
  const [startDate, setStartDate] = useState(today);

  return (
    <ScreenContainer>
      <SectionHeader
        title="When do you want to start?"
        subtitle="Pick a day you'll have time to shop for. Your meals and leaderboard score count from that day."
      />
      <StartDatePicker firstDate={today} onChange={setStartDate} value={startDate} />
      <AppButton title="Create My Plan" onPress={() => navigation.navigate('GeneratingDietPlan', { startDate })} />
    </ScreenContainer>
  );
}
