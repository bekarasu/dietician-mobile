import { NavigatorScreenParams } from '@react-navigation/native';

import { LeaderboardPeriod, LeaderboardScope, LegalDocument } from '../types/models';

// Which ranking the Leaderboard tab opens on. Anything left out keeps the tab's default.
export interface LeaderboardTarget {
  scope?: LeaderboardScope;
  period?: LeaderboardPeriod;
  periodStart?: string;
}

// A user's place on the leaderboard their profile was opened from.
export interface ProfileStanding {
  rank: number;
  totalScore: number;
  scope: LeaderboardScope;
  periodLabel: string;
}

export type AuthStackParamList = {
  OnboardingIntro: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyOTP: undefined;
  LegalDocument: { document: LegalDocument };
};

// Shown instead of everything else while the user has documents to accept.
export type LegalStackParamList = {
  LegalUpdate: undefined;
  LegalDocument: { document: LegalDocument };
};

export type OnboardingStackParamList = {
  Onboarding: undefined;
  PlanStartDate: undefined;
  GeneratingDietPlan: { startDate: string };
  FoodSelection: { selectedFoods: string[]; fieldName: string; context?: 'onboarding' | 'profile' };
};

export type AppTabParamList = {
  Home: undefined;
  DietPlan: undefined;
  // A score result notification opens the period and ranking it was about.
  Leaderboard: LeaderboardTarget | undefined;
  ProgressDashboard: undefined;
  ProfileGoals: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<AppTabParamList> | undefined;
  Inventory: undefined;
  HydrationTracking: undefined;
  Friends: undefined;
  SharedPlan: undefined;
  UserProfile: { userId: string; displayName: string; standing?: ProfileStanding };
  ScoreBreakdown: { period: LeaderboardPeriod; periodStart: string };
  BloodTestUpload: undefined;
  WeightProgress: undefined;
  MealReminders: undefined;
  PushNotifications: undefined;
  Notifications: undefined;
  PlanCheckIn: { earliestStartDate: string };
  FoodSelection: { selectedFoods: string[]; fieldName: string; context?: 'onboarding' | 'profile' };
};
