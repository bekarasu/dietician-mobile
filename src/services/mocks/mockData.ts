import {
  CoffeeEntry,
  DailyFoodLog,
  FriendCompetitionEntry,
  HydrationEntry,
  ProgressEntry,
  RefrigeratorItem,
  UserProfile,
} from '../../types/models';

export const mockProfile: UserProfile = {
  id: 'profile-1',
  name: 'Burak',
  age: 31,
  heightCm: 180,
  weightKg: 84,
  targetWeightKg: 78,
  goalType: 'weight_loss',
  dietaryPreferences: ['omnivore', 'dairy_free'],
  dislikedFoods: ['liver', 'mayonnaise'],
  dailyCalorieTarget: 2200,
};

export const mockDailyLogs: DailyFoodLog[] = [
  {
    id: 'log-2',
    foodName: 'Late-night pastries',
    estimatedAmount: '2 large pastries',
    estimatedCalories: 620,
    notes: 'Stressful delivery day at work.',
    recoveryRecommendation:
      'You consumed more calories than planned today. Consider a lighter dinner with high protein and vegetables. Avoid aggressive restriction.',
    createdAt: '2026-05-03T20:00:00.000Z',
  },
  {
    id: 'log-1',
    foodName: 'Office pizza',
    estimatedAmount: '3 slices',
    estimatedCalories: 780,
    notes: 'Skipped lunch and over-ordered during a team meeting.',
    recoveryRecommendation:
      'Balance the next meal with lean protein, fiber, and hydration. Resume your normal plan tomorrow instead of over-correcting.',
    createdAt: '2026-05-02T18:30:00.000Z',
  },
];

export const mockInventory: RefrigeratorItem[] = [
  {
    id: 'inventory-1',
    productName: 'Greek yogurt',
    category: 'Dairy',
    quantity: '2 cups',
    expirationDate: '2026-05-08',
  },
  {
    id: 'inventory-2',
    productName: 'Chicken breast',
    category: 'Protein',
    quantity: '600 g',
    expirationDate: '2026-05-06',
  },
  {
    id: 'inventory-3',
    productName: 'Spinach',
    category: 'Produce',
    quantity: '1 bag',
    expirationDate: '2026-05-05',
  },
];

export const mockProgressEntries: ProgressEntry[] = [
  {
    id: 'progress-1',
    date: '2026-04-14',
    weightKg: 86.1,
    weeklyConsistency: 72,
    goalProgress: 30,
    note: 'Recovered from travel week and re-established breakfast timing.',
  },
  {
    id: 'progress-2',
    date: '2026-04-21',
    weightKg: 85.3,
    weeklyConsistency: 78,
    goalProgress: 39,
    note: 'Less grazing after dinner and more consistent hydration.',
  },
  {
    id: 'progress-3',
    date: '2026-04-28',
    weightKg: 84.6,
    weeklyConsistency: 81,
    goalProgress: 46,
    note: 'Meal prep held up through a busy week.',
  },
  {
    id: 'progress-4',
    date: '2026-05-03',
    weightKg: 84,
    weeklyConsistency: 84,
    goalProgress: 52,
    note: 'Weekend structure improved and late-night snacking dropped.',
  },
];

export const mockFriends: FriendCompetitionEntry[] = [
  {
    id: 'friend-1',
    name: 'Elif',
    avatarColor: '#7BB661',
    score: 91,
    rank: 1,
    consistency: 88,
    difficultyRatio: 1.24,
    progressLabel: 'Strong adherence on a more aggressive cut',
  },
  {
    id: 'friend-2',
    name: 'Burak',
    avatarColor: '#C06C48',
    score: 86,
    rank: 2,
    consistency: 84,
    difficultyRatio: 1.16,
    progressLabel: 'Steady weight-loss trend with good weekly structure',
  },
  {
    id: 'friend-3',
    name: 'Mert',
    avatarColor: '#3A6EA5',
    score: 80,
    rank: 3,
    consistency: 79,
    difficultyRatio: 1.08,
    progressLabel: 'High consistency, slower scale movement',
  },
];

export const mockHydration: HydrationEntry = {
  date: '2026-05-04',
  waterMl: 1500,
  targetWaterMl: 2500,
};

export const mockCoffee: CoffeeEntry = {
  date: '2026-05-04',
  cups: 2,
  targetCups: 3,
};