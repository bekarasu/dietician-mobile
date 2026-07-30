import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { Ionicons } from '@expo/vector-icons';

import { DailyFoodLogScreen } from '../screens/DailyFoodLogScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MealRecommendationScreen } from '../screens/MealRecommendationScreen';
import { ProfileGoalsScreen } from '../screens/ProfileGoalsScreen';
import { ProgressDashboardScreen } from '../screens/ProgressDashboardScreen';
import { theme } from '../theme/theme';
import { AppTabParamList } from './navigationTypes';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function AppTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          height: 74,
          paddingBottom: theme.spacing.sm,
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
        component={DailyFoodLogScreen}
        name="DailyFoodLog"
        options={{
          title: 'Food Log',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'journal' : 'journal-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        component={MealRecommendationScreen}
        name="MealRecommendation"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'restaurant' : 'restaurant-outline'} size={size} color={color} />
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