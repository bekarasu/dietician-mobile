import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { GeneratingDietPlanScreen } from '../screens/GeneratingDietPlanScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { theme } from '../theme/theme'

import type { OnboardingStackParamList } from './navigationTypes'

const Stack = createNativeStackNavigator<OnboardingStackParamList>()

export function OnboardingNavigator() {
	return (
		<Stack.Navigator
			screenOptions={{
				headerShown: false,
				contentStyle: { backgroundColor: theme.colors.background },
			}}
		>
			<Stack.Screen component={OnboardingScreen} name="Onboarding" />
			<Stack.Screen component={GeneratingDietPlanScreen} name="GeneratingDietPlan" />
		</Stack.Navigator>
	)
}
