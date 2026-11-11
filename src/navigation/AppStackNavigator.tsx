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
import { MealRemindersScreen } from '../screens/MealRemindersScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PushNotificationsScreen } from '../screens/PushNotificationsScreen';
import { PlanCheckInScreen } from '../screens/PlanCheckInScreen';
import { t } from '../i18n';
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
      <Stack.Screen component={AppTabNavigator} name="Tabs" options={{ headerShown: false, title: t('navigation.home') }} />
      <Stack.Screen component={InventoryScreen} name="Inventory" options={{ title: t('navigation.fridge') }} />
      <Stack.Screen component={HydrationTrackingScreen} name="HydrationTracking" options={{ title: t('navigation.hydration') }} />
      <Stack.Screen component={FriendsScreen} name="Friends" options={{ title: t('navigation.friends') }} />
      <Stack.Screen component={SharedPlanScreen} name="SharedPlan" options={{ title: t('navigation.sharedMeals') }} />
      <Stack.Screen component={UserProfileScreen} name="UserProfile" options={{ title: t('navigation.profile') }} />
      <Stack.Screen component={ScoreBreakdownScreen} name="ScoreBreakdown" options={{ title: t('navigation.score') }} />
      <Stack.Screen component={BloodTestUploadScreen} name="BloodTestUpload" options={{ title: t('navigation.bloodTests') }} />
      <Stack.Screen component={WeightProgressScreen} name="WeightProgress" options={{ title: t('navigation.weightProgress') }} />
      <Stack.Screen component={MealRemindersScreen} name="MealReminders" options={{ title: t('navigation.mealReminders') }} />
      <Stack.Screen component={PushNotificationsScreen} name="PushNotifications" options={{ title: t('navigation.pushNotifications') }} />
      <Stack.Screen component={NotificationsScreen} name="Notifications" options={{ title: t('navigation.notifications') }} />
      <Stack.Screen component={PlanCheckInScreen} name="PlanCheckIn" options={{ title: t('navigation.planCheckIn') }} />
      <Stack.Screen component={FoodSelectionScreen} name="FoodSelection" options={{ title: t('navigation.selectFoods') }} />
    </Stack.Navigator>
  );
}
