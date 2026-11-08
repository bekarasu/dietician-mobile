import { LeaderboardPeriod, LeaderboardScope } from '../types/models';

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
  Leaderboard: undefined;
  ProgressDashboard: undefined;
  ProfileGoals: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  Inventory: undefined;
  HydrationTracking: undefined;
  Friends: undefined;
  SharedPlan: undefined;
  UserProfile: { userId: string; displayName: string; standing?: ProfileStanding };
  ScoreBreakdown: { period: LeaderboardPeriod; periodStart: string };
  BloodTestUpload: undefined;
  WeightProgress: undefined;
  PlanCheckIn: { earliestStartDate: string };
  FoodSelection: { selectedFoods: string[]; fieldName: string; context?: 'onboarding' | 'profile' };
};