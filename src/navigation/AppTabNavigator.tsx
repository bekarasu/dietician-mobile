import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { useMealReminderSync } from '../features/reminders/useMealReminderSync';
import { usePushNotifications } from '../features/notifications/usePushNotifications';
import { useSharedPlanOfferPrompt } from '../features/sharedPlan/useSharedPlanOfferPrompt';
import { DietPlanScreen } from '../screens/DietPlanScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LeaderboardScreen } from '../screens/LeaderboardScreen';
import { ProfileGoalsScreen } from '../screens/ProfileGoalsScreen';
import { ProgressDashboardScreen } from '../screens/ProgressDashboardScreen';
import { theme } from '../theme/theme';
import { AppTabParamList } from './navigationTypes';
import { useOnboardingStore } from '../store/useOnboardingStore';

const Tab = createBottomTabNavigator<AppTabParamList>();

const TAB_BAR_CONTENT_HEIGHT = 54;

export function AppTabNavigator() {
  const insets = useSafeAreaInsets();
  const landingTab = useOnboardingStore((state) => state.landingTab);
  const clearLandingTab = useOnboardingStore((state) => state.clearLandingTab);
  // A numeric height turns off React Navigation's own inset handling, so both values account for it here.
  const tabBarPaddingBottom = Math.max(insets.bottom, theme.spacing.sm);

  useMealReminderSync();
  usePushNotifications();
  useSharedPlanOfferPrompt();

  useEffect(() => {
    if (landingTab) {
      clearLandingTab();
    }
  }, [landingTab, clearLandingTab]);

  return (
    <Tab.Navigator
      initialRouteName={landingTab ?? 'Home'}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          height: TAB_BAR_CONTENT_HEIGHT + theme.spacing.sm + tabBarPaddingBottom,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: theme.spacing.sm,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
      }}
    >
      <Tab.Screen
        component={HomeScreen}
        name="Home"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        component={DietPlanScreen}
        name="DietPlan"
        options={{
          title: 'Diet Plan',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        component={LeaderboardScreen}
        name="Leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        component={ProgressDashboardScreen}
        name="ProgressDashboard"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        component={ProfileGoalsScreen}
        name="ProfileGoals"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
