import { DietPlan } from '../../types/models';
import { addCalendarDays, calendarDaysBetween, toCalendarDate } from '../../utils/date';

export type PlanPhase = 'upcoming' | 'running' | 'ended';

export interface PlanSchedule {
  phase: PlanPhase;
  startDate: string;
  endDate: string | null;
  // Today's 1-based plan day. Set only while the plan is running.
  currentDay: number | null;
  totalDays: number | null;
  // Days until day 1. Set only while the plan is upcoming.
  daysUntilStart: number | null;
}

// "tomorrow" or "in 3 days", for a plan that hasn't started.
export function formatStartsIn(daysUntilStart: number) {
  return daysUntilStart === 1 ? 'tomorrow' : `in ${daysUntilStart} days`;
}

// Plan dates arrive as midnight UTC timestamps, so the date part is the calendar
// day. Going through new Date() would shift it in timezones behind UTC.
function toPlanDate(value: string) {
  return value.slice(0, 10);
}

export function getPlanSchedule(plan: DietPlan): PlanSchedule {
  const today = toCalendarDate(new Date());
  const startDate = toPlanDate(plan.startDate);
  const endDate = plan.endDate ? toPlanDate(plan.endDate) : null;
  const totalDays = endDate ? calendarDaysBetween(startDate, endDate) + 1 : null;

  if (today < startDate) {
    return { phase: 'upcoming', startDate, endDate, currentDay: null, totalDays, daysUntilStart: calendarDaysBetween(today, startDate) };
  }
  if (endDate && today > endDate) {
    return { phase: 'ended', startDate, endDate, currentDay: null, totalDays, daysUntilStart: null };
  }
  return {
    phase: 'running',
    startDate,
    endDate,
    currentDay: calendarDaysBetween(startDate, today) + 1,
    totalDays,
    daysUntilStart: null,
  };
}

// meal.dayOfWeek is a 1-based plan day, not a weekday.
export function getPlanDayDate(plan: DietPlan, day: number) {
  return addCalendarDays(toPlanDate(plan.startDate), day - 1);
}
