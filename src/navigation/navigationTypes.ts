import { LeaderboardPeriod } from '../types/models';

export type AuthStackParamList = {
  OnboardingIntro: undefined;
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  VerifyOTP: undefined;
};

export type OnboardingStackParamList = {
  Onboarding: undefined;
  GeneratingDietPlan: undefined;
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
  ScoreBreakdown: { period: LeaderboardPeriod; periodStart: string };
  BloodTestUpload: undefined;
  WeightProgress: undefined;
  FoodSelection: { selectedFoods: string[]; fieldName: string; context?: 'onboarding' | 'profile' };
};