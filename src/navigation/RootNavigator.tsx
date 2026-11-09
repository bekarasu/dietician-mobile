import { AuthNavigator } from './AuthNavigator';
import { AppStackNavigator } from './AppStackNavigator';
import { GeneratingDietPlanScreen } from '../screens/GeneratingDietPlanScreen';
import { useAuthStore } from '../store/useAuthStore';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useLegalStore } from '../store/useLegalStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { LegalNavigator } from './LegalNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';

export function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasPendingLegal = useLegalStore((state) => state.pending.length > 0);
  const isOnboardingCompleted = useOnboardingStore((state) => state.isCompleted);
  const resumedGeneration = useDietPlanStore((state) => state.resumedGeneration);

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  // Updated terms come before onboarding and the app.
  if (hasPendingLegal) {
    return <LegalNavigator />;
  }

  if (!isOnboardingCompleted) {
    return <OnboardingNavigator />;
  }

  // The app was closed while a plan was generating, so it waits for that first.
  return resumedGeneration ? <GeneratingDietPlanScreen /> : <AppStackNavigator />;
}