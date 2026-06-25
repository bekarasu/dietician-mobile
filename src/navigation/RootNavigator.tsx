import { AuthNavigator } from './AuthNavigator';
import { AppStackNavigator } from './AppStackNavigator';
import { useAuthStore } from '../store/useAuthStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { OnboardingNavigator } from './OnboardingNavigator';

export function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isOnboardingCompleted = useOnboardingStore((state) => state.isCompleted);

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  return isOnboardingCompleted ? <AppStackNavigator /> : <OnboardingNavigator />;
}