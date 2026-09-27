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
  ProgressDashboard: undefined;
  ProfileGoals: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  Inventory: undefined;
  HydrationTracking: undefined;
  FriendCompetition: undefined;
  BloodTestUpload: undefined;
  WeightProgress: undefined;
  FoodSelection: { selectedFoods: string[]; fieldName: string; context?: 'onboarding' | 'profile' };
};