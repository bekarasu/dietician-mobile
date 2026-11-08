import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BloodTestUploadScreen } from '../screens/BloodTestUploadScreen';
import { FriendsScreen } from '../screens/FriendsScreen';
import { HydrationTrackingScreen } from '../screens/HydrationTrackingScreen';
import { ScoreBreakdownScreen } from '../screens/ScoreBreakdownScreen';
import { SharedPlanScreen } from '../screens/SharedPlanScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { WeightProgressScreen } from '../screens/WeightProgressScreen';
import { FoodSelectionScreen } from '../screens/FoodSelectionScreen';
import { InventoryScreen } from '../screens/InventoryScreen';
import { PlanCheckInScreen } from '../screens/PlanCheckInScreen';
import { theme } from '../theme/theme';
import { AppTabNavigator } from './AppTabNavigator';
import { AppStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: theme.colors.text,
        // The previous screen is a tab, so the back label would always read as the "Tabs" route's title.
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: theme.colors.surface },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen component={AppTabNavigator} name="Tabs" options={{ headerShown: false, title: 'Home' }} />
      <Stack.Screen component={InventoryScreen} name="Inventory" options={{ title: 'My Fridge' }} />
      <Stack.Screen component={HydrationTrackingScreen} name="HydrationTracking" options={{ title: 'Water & Coffee' }} />
      <Stack.Screen component={FriendsScreen} name="Friends" options={{ title: 'Friends' }} />
      <Stack.Screen component={SharedPlanScreen} name="SharedPlan" options={{ title: 'Shared Meals' }} />
      <Stack.Screen component={UserProfileScreen} name="UserProfile" options={{ title: 'Profile' }} />
      <Stack.Screen component={ScoreBreakdownScreen} name="ScoreBreakdown" options={{ title: 'Your Score' }} />
      <Stack.Screen component={BloodTestUploadScreen} name="BloodTestUpload" options={{ title: 'Blood tests' }} />
      <Stack.Screen component={WeightProgressScreen} name="WeightProgress" options={{ title: 'Weight Progress' }} />
      <Stack.Screen component={PlanCheckInScreen} name="PlanCheckIn" options={{ title: 'Plan Check-In' }} />
      <Stack.Screen component={FoodSelectionScreen} name="FoodSelection" options={{ title: 'Select Foods' }} />
    </Stack.Navigator>
  );
}