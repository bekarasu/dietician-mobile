import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { theme } from '../theme/theme';
import type { AuthStackParamList } from './navigationTypes';

import { LoginScreen } from '../screens/LoginScreen';
import { OnboardingIntroScreen } from '../screens/OnboardingIntroScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { VerifyOTPScreen } from '../screens/VerifyOTPScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="OnboardingIntro"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen component={OnboardingIntroScreen} name="OnboardingIntro" options={{ animation: 'fade' }} />
      <Stack.Screen component={WelcomeScreen} name="Welcome" />
      <Stack.Screen component={LoginScreen} name="Login" />
      <Stack.Screen component={RegisterScreen} name="Register" />
      <Stack.Screen component={VerifyOTPScreen} name="VerifyOTP" />
    </Stack.Navigator>
  );
}