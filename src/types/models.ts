export type GoalType = 'weight_loss' | 'maintenance' | 'body_recomposition' | 'habit_building';

export type DietaryPreference =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'gluten_free'
  | 'dairy_free';

export interface FoodResponse {
  id: string;
  name: string;
  kcal: number;
  kj: number;
  protein: number;
  carbs: number;
  fats: number;
  portionSize: number;
}

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
  availableIngredients: string[];
  dailyCalorieTarget: number;
  // Set by the server from weight and age; users can't change them.
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

export interface DietMeal {
  id: string;
  dayOfWeek: number;
  mealType: string;
  recipeId: string | null;
  name: string;
  description: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  ingredients: string[];
  isTaken?: boolean;
  isExtra?: boolean;
}

export interface DietPlan {
  id: string;
  userId: string;
  startDate: string;
  endDate: string | null;
  goals: string;
  status: string;
  meals: DietMeal[];
  // First day a next plan could start. Null before the plan's last day and once a next plan exists.
  earliestRenewalDate: string | null;
  nextPlan?: DietPlan;
}

export type PlanEffort = 'too_hard' | 'about_right' | 'too_easy';

export type PlanMealChoice = 'keep_favourites' | 'start_fresh';

export interface PlanCheckIn {
  startDate: string;
  effort: PlanEffort;
  mealChoice: PlanMealChoice;
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

export type LeaderboardScope = 'friends' | 'global';

export type LeaderboardPeriod = 'weekly' | 'monthly';

export type ScoreCalculationStatus = 'CALCULATED' | 'INSUFFICIENT_DATA' | 'INELIGIBLE' | 'NOT_CALCULATED';

export interface LeaderboardStanding {
  rank: number | null;
  totalScore: number | null;
  calculationStatus: ScoreCalculationStatus;
  statusReason?: string;
  nextRank: number | null;
  pointsToNextRank: number | null;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  rank: number;
  totalScore: number;
  scoreDifference: number | null;
  isCurrentUser: boolean;
}

export interface Leaderboard {
  periodType: LeaderboardPeriod;
  periodStart: string;
  periodEndExclusive: string;
  previousPeriodStart: string;
  nextPeriodStart: string | null;
  totalParticipants: number;
  friendCount?: number;
  lastUpdatedAt: string | null;
  currentUser: LeaderboardStanding;
  participants: LeaderboardEntry[];
  hasMore: boolean;
}

export interface ScoreBreakdown {
  periodType: LeaderboardPeriod;
  periodStart: string;
  periodEndExclusive: string;
  totalScore: number | null;
  calculationStatus: ScoreCalculationStatus;
  statusReason?: string;
  calculatedAt?: string;
  progressScore: number | null;
  adherenceScore: number | null;
  difficultyMultiplier?: number;
  baselineWeightKg?: number;
  currentWeightKg?: number;
  expectedLossKg?: number;
  actualLossKg?: number;
  windowDays?: number;
  completedActivities: number;
  totalActivities: number;
  // Missing on scores calculated before water and coffee counted.
  waterScore?: number | null;
  coffeeScore?: number | null;
}

export type DayPointsStatus = 'SCORED' | 'IN_PROGRESS' | 'NOT_SCORED' | 'UPCOMING';

// What one day earned towards the habit parts of its weekly score: 10 per breakfast, lunch and dinner,
// up to 10 for water and 5 for coffee. Only the max fields are set for a day that didn't count.
export interface DayPoints {
  date: string;
  status: DayPointsStatus;
  statusReason?: string;
  points: number;
  maxPoints: number;
  mealsLogged: number;
  mealPoints: number;
  maxMealPoints: number;
  waterMl: number;
  waterTargetMl: number;
  waterPoints: number;
  maxWaterPoints: number;
  coffeeCups: number;
  coffeeLimitCups: number;
  coffeePoints: number;
  maxCoffeePoints: number;
}

// The parts add up to totalScore, and are null unless the week is CALCULATED.
export interface WeekPoints {
  periodStart: string;
  periodEndExclusive: string;
  calculationStatus: ScoreCalculationStatus;
  statusReason?: string;
  totalScore: number | null;
  weightPoints: number | null;
  mealPoints: number | null;
  waterPoints: number | null;
  coffeePoints: number | null;
}

export interface DailyPoints {
  days: DayPoints[];
  weeks: WeekPoints[];
}

export type ActivityType = 'MEAL' | 'WEIGHT' | 'WATER' | 'COFFEE';

// One thing the user logged. Water and coffee are the day's totals, so they have
// no loggedAt. points is null for a weigh-in, which counts towards the week's
// weight points rather than a day's.
export interface Activity {
  type: ActivityType;
  loggedAt?: string;
  mealType?: string;
  name?: string;
  weightKg?: number;
  changeKg?: number;
  waterMl?: number;
  waterTargetMl?: number;
  coffeeCups?: number;
  coffeeLimitCups?: number;
  points: number | null;
  maxPoints?: number;
  // Why something on a scored day earned nothing. A day that wasn't scored says why in its statusReason.
  reason?: string;
}

export interface ActivityDay extends DayPoints {
  activities: Activity[];
}

// A finalized week shows the score the leaderboard ranked; its days are always worked out from current data.
export interface WeekActivity {
  week: WeekPoints;
  finalized: boolean;
  // Percentage of the meal, water and coffee points due so far that were earned. Null until something is due.
  consistency: number | null;
  previousPeriodStart: string | null;
  nextPeriodStart: string | null;
  // Newest day first.
  days: ActivityDay[];
}

export interface Friend {
  userId: string;
  displayName: string;
  friendsSince: string;
}

export interface PendingFriendRequest {
  id: string;
  userId: string;
  displayName: string;
  createdAt: string;
}

export interface FriendRequestList {
  incoming: PendingFriendRequest[];
  outgoing: PendingFriendRequest[];
}

export type FriendRelationship = 'NONE' | 'FRIEND' | 'OUTGOING_REQUEST' | 'INCOMING_REQUEST';

export interface UserSearchResult {
  userId: string;
  displayName: string;
  relationship: FriendRelationship;
  requestId?: string;
}

export interface BlockedUser {
  userId: string;
  displayName: string;
  blockedAt: string;
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

export type OnboardingPageId = 'basics' | 'goals' | 'preferences' | 'blood-test';

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
  bloodTestUploaded: boolean;
}

export interface OnboardingPageResponse {
  pageId: OnboardingPageId;
  message: string;
  patch?: Partial<OnboardingDraft>;
  profile?: UserProfile;
}