import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { FoodSelectionScreen } from '../screens/FoodSelectionScreen'
import { GeneratingDietPlanScreen } from '../screens/GeneratingDietPlanScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { PlanStartDateScreen } from '../screens/PlanStartDateScreen'
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
			<Stack.Screen component={PlanStartDateScreen} name="PlanStartDate" />
			{/* Leaving goes through its Cancel button, which stops the generation. */}
			<Stack.Screen component={GeneratingDietPlanScreen} name="GeneratingDietPlan" options={{ gestureEnabled: false }} />
			<Stack.Screen component={FoodSelectionScreen} name="FoodSelection" />
		</Stack.Navigator>
	)
}
