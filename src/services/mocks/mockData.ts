import {
  CoffeeEntry,
  DailyFoodLog,
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
  availableIngredients: [],
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
    note: 'Recovered from travel week and re-established breakfast timing.',
  },
  {
    id: 'progress-2',
    date: '2026-04-21',
    weightKg: 85.3,
    note: 'Less grazing after dinner and more consistent hydration.',
  },
  {
    id: 'progress-3',
    date: '2026-04-28',
    weightKg: 84.6,
    note: 'Meal prep held up through a busy week.',
  },
  {
    id: 'progress-4',
    date: '2026-05-03',
    weightKg: 84,
    note: 'Weekend structure improved and late-night snacking dropped.',
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

export const mockHistoricalHydration: HydrationEntry[] = [
  { date: '2026-04-28', waterMl: 2000, targetWaterMl: 2500 },
  { date: '2026-04-29', waterMl: 2200, targetWaterMl: 2500 },
  { date: '2026-04-30', waterMl: 1800, targetWaterMl: 2500 },
  { date: '2026-05-01', waterMl: 2500, targetWaterMl: 2500 },
  { date: '2026-05-02', waterMl: 2600, targetWaterMl: 2500 },
  { date: '2026-05-03', waterMl: 2100, targetWaterMl: 2500 },
  { date: '2026-05-04', waterMl: 1500, targetWaterMl: 2500 },
];

export const mockHistoricalCoffee: CoffeeEntry[] = [
  { date: '2026-04-28', cups: 3, targetCups: 3 },
  { date: '2026-04-29', cups: 2, targetCups: 3 },
  { date: '2026-04-30', cups: 4, targetCups: 3 },
  { date: '2026-05-01', cups: 2, targetCups: 3 },
  { date: '2026-05-02', cups: 1, targetCups: 3 },
  { date: '2026-05-03', cups: 2, targetCups: 3 },
  { date: '2026-05-04', cups: 2, targetCups: 3 },
];