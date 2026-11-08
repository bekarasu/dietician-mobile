export type GoalType = 'weight_loss' | 'maintenance' | 'body_recomposition' | 'habit_building';

// Programs for a stage of life that changes what a plan needs, offered beside
// the main goals rather than as one. Only pregnancy so far.
export type SpecialProgram = 'pregnancy';

export type DietaryPreference =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'gluten_free'
  | 'dairy_free';

// Nutrition values are per portion_size grams, which is 100 for every food so far.
export interface FoodResponse {
  id: string;
  name: string;
  kcal: number;
  kj: number;
  protein: number;
  carbs: number;
  fats: number;
  portion_size: number;
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
  // Set while the user has a pregnancy plan. The server works the week out from
  // the due date each time, and drops both once the pregnancy is over.
  pregnancyWeek?: number;
  pregnancyDueDate?: string;
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
  // Everyone in the user's shared group has this meal, in their own portion, so
  // swapping it changes it for all of them.
  isShared?: boolean;
}

// A meal as POST /daily-logs and POST /diet-plans/active/meals both take it.
export interface MealEntry {
  mealType: string;
  name: string;
  calories: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
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
  // Set while the plan is shared: it was made for the user's group and they're
  // still in it. Leaving keeps the plan as an ordinary one.
  sharedGroupId?: string | null;
}

// 'shared' is a plan the group's owner started for everyone in it. Every member
// sees it running, and any of them can cancel it.
export type PlanGenerationKind = 'create' | 'renew' | 'update' | 'shared';

export type PlanGenerationStatus = 'running' | 'completed' | 'failed' | 'cancelled';

// An AI run building a plan. The server finishes it even after the app closes,
// and keeps the latest one for a day.
export interface PlanGeneration {
  id: string;
  kind: PlanGenerationKind;
  status: PlanGenerationStatus;
  // The plan it saved, once completed.
  dietPlanId: string | null;
  startedAt: string;
  finishedAt: string | null;
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
  createdAt: string;
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
  // Weight is typed in, so the loss that scores (countedLossKg) is capped by what the logged meals'
  // calorie deficit explains. Missing on scores calculated before this rule.
  deficitKcal?: number;
  explainedLossKg?: number;
  countedLossKg?: number;
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
// A SCORED day with statusReason 'plan_replaced' still counts towards the week, with its points reset.
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

// Another user as the viewer sees them. friendsSince is set only for friends.
export interface PublicProfile {
  userId: string;
  displayName: string;
  relationship: FriendRelationship;
  requestId?: string;
  friendsSince?: string;
}

export type SharedMemberStatus = 'joined' | 'invited';

// Someone in a shared group. Members only see each other's names, never their
// plans, portions or health data.
export interface SharedGroupMember {
  userId: string;
  displayName: string;
  status: SharedMemberStatus;
  isOwner: boolean;
  isCurrentUser: boolean;
  joinedAt: string | null;
}

// Friends who get the same meals, each in portions for their own goal and
// weight. The owner invites up to maxFriends friends, invitations included, and
// starts shared plans.
export interface SharedGroup {
  id: string;
  isOwner: boolean;
  maxFriends: number;
  // The owner first, then joined members, then invitations.
  members: SharedGroupMember[];
}

export interface SharedPlanInvite {
  groupId: string;
  invitedAt: string;
  owner: SharedGroupMember;
  // Everyone who has joined, owner first.
  members: SharedGroupMember[];
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
  specialPrograms: SpecialProgram[];
  // Only used while specialPrograms has pregnancy.
  pregnancyWeek: string;
  allergies: string;
  dislikedFoods: string;
  dailyCalorieTarget: string;
  bloodTestUploaded: boolean;
}

export interface OnboardingPageResponse {
  pageId: OnboardingPageId;
  message: string;
  patch?: Partial<OnboardingDraft>;
}