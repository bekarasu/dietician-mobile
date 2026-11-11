import { getLocaleTag, t, translateIfExists } from '../i18n';
import { GoalType } from '../types/models';

// One formatter per locale and precision, since creating them is slow.
const decimalFormats = new Map<string, Intl.NumberFormat>();

// 72.5 in English, 72,5 in Turkish.
export function formatDecimal(value: number, digits = 1) {
  const locale = getLocaleTag();
  const cacheKey = `${locale}:${digits}`;
  let format = decimalFormats.get(cacheKey);
  if (!format) {
    format = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    decimalFormats.set(cacheKey, format);
  }
  return format.format(value);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(getLocaleTag(), {
    month: 'short',
    day: 'numeric',
  });
}

export function formatCalories(value: number) {
  return `${Math.round(value)} kcal`;
}

export function formatWeight(value: number) {
  return `${formatDecimal(value)} kg`;
}

export function formatPercent(value: number) {
  return t('format.percent', { value: Math.round(value * 100) });
}

export function joinList(values: string[]) {
  return values.length === 0 ? t('format.notSetYet') : values.join(', ');
}

export function formatGoalType(goalType: GoalType) {
  return translateIfExists(`options.goal.${goalType}`) ?? goalType;
}

// Meal types come from the server in English (Breakfast, Lunch, Snack, Dinner).
export function formatMealType(mealType: string) {
  return translateIfExists(`common.mealTypes.${mealType}`) ?? mealType;
}

export function formatKg(value: number) {
  return `${formatDecimal(value)} kg`;
}

// Signed, so a loss reads as -0.4 kg and a gain as +0.4 kg.
export function formatKgChange(value: number) {
  // `|| 0` turns -0 into 0, which would otherwise print as -0.0.
  const rounded = Number(value.toFixed(1)) || 0;
  return `${rounded > 0 ? '+' : ''}${formatDecimal(rounded)} kg`;
}

export function formatLitres(ml: number) {
  return `${formatDecimal(ml / 1000)} L`;
}