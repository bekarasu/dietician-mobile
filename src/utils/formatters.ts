import { GoalType } from '../types/models';

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatCalories(value: number) {
  return `${Math.round(value)} kcal`;
}

export function formatWeight(value: number) {
  return `${value.toFixed(1)} kg`;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function joinList(values: string[]) {
  return values.length === 0 ? 'Not set yet' : values.join(', ');
}

export function formatGoalType(goalType: GoalType) {
  switch (goalType) {
    case 'weight_loss':
      return 'Weight loss';
    case 'maintenance':
      return 'Healthy maintenance';
    case 'body_recomposition':
      return 'Body recomposition';
    case 'habit_building':
      return 'Habit building';
    default:
      return goalType;
  }
}

export function formatKg(value: number) {
  return `${value.toFixed(1)} kg`;
}