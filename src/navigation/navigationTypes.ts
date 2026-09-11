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
};

export type AppTabParamList = {
  Home: undefined;
  DailyFoodLog: undefined;
  MealRecommendation: undefined;
  ProgressDashboard: undefined;
  ProfileGoals: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  HydrationTracking: undefined;
  FriendCompetition: undefined;
  BloodTestUpload: undefined;
  WeightProgress: undefined;
  FoodSelection: { selectedFoods: string[]; fieldName: string };
};