import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BloodTestUploadScreen } from '../screens/BloodTestUploadScreen';
import { FriendCompetitionScreen } from '../screens/FriendCompetitionScreen';
import { HydrationTrackingScreen } from '../screens/HydrationTrackingScreen';
import { RefrigeratorInventoryScreen } from '../screens/RefrigeratorInventoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { WeightProgressScreen } from '../screens/WeightProgressScreen';
import { theme } from '../theme/theme';
import { AppTabNavigator } from './AppTabNavigator';
import { AppStackParamList } from './navigationTypes';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: theme.colors.text,
        headerStyle: { backgroundColor: theme.colors.surface },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen component={AppTabNavigator} name="Tabs" options={{ headerShown: false }} />
      <Stack.Screen component={RefrigeratorInventoryScreen} name="RefrigeratorInventory" options={{ title: 'Inventory' }} />
      <Stack.Screen component={HydrationTrackingScreen} name="HydrationTracking" options={{ title: 'Water & Coffee' }} />
      <Stack.Screen component={FriendCompetitionScreen} name="FriendCompetition" options={{ title: 'Friend Challenge' }} />
      <Stack.Screen component={BloodTestUploadScreen} name="BloodTestUpload" options={{ title: 'Blood Test Upload' }} />
      <Stack.Screen component={SettingsScreen} name="Settings" options={{ title: 'Settings' }} />
      <Stack.Screen component={WeightProgressScreen} name="WeightProgress" options={{ title: 'Weight Progress' }} />
    </Stack.Navigator>
  );
}