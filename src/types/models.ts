export type GoalType = 'weight_loss' | 'maintenance' | 'body_recomposition' | 'habit_building';

export type DietaryPreference =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'gluten_free'
  | 'dairy_free';

export interface User {
  id: string;
  name: string;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  gender?: string;
  activityLevel?: string;
  goalType: GoalType;
  dietaryPreferences: DietaryPreference[];
  allergies?: string[];
  dislikedFoods: string[];
  dailyCalorieTarget: number;
  targetWaterMl?: number;
  targetCoffeeCups?: number;
}

export interface DailyFoodLogInput {
  foodName: string;
  estimatedAmount: string;
  estimatedCalories: number;
  notes: string;
}

export interface DailyFoodLog extends DailyFoodLogInput {
  id: string;
  createdAt: string;
  recoveryRecommendation: string;
}

export interface DailyLogResponse {
  id: string;
  userId: string;
  logDate: string;
  waterIntakeMl: number;
  coffeeCups: number;
  sleepHours: number;
  exerciseMinutes: number;
  mood: string;
  notes: string;
  meals: any[];
}

export interface RefrigeratorItemInput {
  productName: string;
  category: string;
  quantity: string;
  expirationDate: string;
}

export interface RefrigeratorItem extends RefrigeratorItemInput {
  id: string;
}

export interface MealRecommendation {
  id: string;
  title: string;
  summary: string;
  meals: string[];
  rationale: string[];
  disclaimer: string;
  createdAt: string;
}

export interface BloodTestResult {
  testName: string;
  result: string;
  resultUnit: string;
  referenceValue: string;
}

export interface BloodTestGroup {
  groupName: string;
  groupDate: string;
  tests: BloodTestResult[];
}

export interface BloodTestUpload {
  id: string;
  status: string;
  uploadedAt?: string;
  parsedResults?: {
    testGroups?: BloodTestGroup[];
  };
  isHidden: boolean;
}

export interface UploadDetailResponse {
  upload: BloodTestUpload;
  metadata: any[];
}

export interface ProgressEntry {
  id: string;
  date: string;
  weightKg: number;
  weeklyConsistency: number;
  goalProgress: number;
  note?: string;
}

export interface HydrationEntry {
  date: string;
  waterMl: number;
  targetWaterMl: number;
}

export interface CoffeeEntry {
  date: string;
  cups: number;
  targetCups: number;
}

export interface FriendCompetitionEntry {
  id: string;
  name: string;
  avatarColor: string;
  score: number;
  rank: number;
  consistency: number;
  difficultyRatio: number;
  progressLabel: string;
}

export interface RecommendationInput {
  goalType: GoalType;
  dietaryPreferences: DietaryPreference[];
  dailyLogs: DailyFoodLog[];
  inventory: RefrigeratorItem[];
  progress: ProgressEntry[];
  hydration: HydrationEntry;
  coffee: CoffeeEntry;
}

export type OnboardingPageId = 'basics' | 'goals' | 'preferences' | 'blood-test' | 'habits';

export interface OnboardingDraft {
  name: string;
  age: string;
  heightCm: string;
  weightKg: string;
  targetWeightKg: string;
  gender: string;
  activityLevel: string;
  goalType: GoalType;
  dietaryPreferences: DietaryPreference[];
  allergies: string;
  dislikedFoods: string;
  dailyCalorieTarget: string;
  targetWaterMl: string;
  targetCoffeeCups: string;
  bloodTestUploaded: boolean;
}

export interface OnboardingPageResponse {
  pageId: OnboardingPageId;
  message: string;
  patch?: Partial<OnboardingDraft>;
  profile?: UserProfile;
}