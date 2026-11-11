import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { FoodSelectionScreen } from '../screens/FoodSelectionScreen'
import { GeneratingDietPlanScreen } from '../screens/GeneratingDietPlanScreen'
import { OnboardingScreen } from '../screens/OnboardingScreen'
import { PlanStartDateScreen } from '../screens/PlanStartDateScreen'
import { t } from '../i18n';
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
			{/* The only onboarding screen with a header: it has no back button of its own. */}
			<Stack.Screen
				component={FoodSelectionScreen}
				name="FoodSelection"
				options={{
					headerShown: true,
					title: t('navigation.selectFoods'),
					headerTintColor: theme.colors.text,
					// Otherwise the back label reads as the "Onboarding" route's name.
					headerBackButtonDisplayMode: 'minimal',
					headerStyle: { backgroundColor: theme.colors.surface },
					headerShadowVisible: false,
				}}
			/>
		</Stack.Navigator>
	)
}
