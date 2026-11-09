import { showDialog } from '../dialog/dialogStore';
import { isGenerationCancelled } from '../dietPlan/planGeneration';
import { getPlanSchedule } from '../dietPlan/planSchedule';
import { leaderboardService } from '../../services/leaderboardService';
import { useDietPlanStore } from '../../store/useDietPlanStore';
import { useSharedPlanOfferStore } from '../../store/useSharedPlanOfferStore';
import { DietPlan, SharedPlanOffer } from '../../types/models';
import { addCalendarDays, formatCalendarDate, toCalendarDate } from '../../utils/date';

// The points switching resets, as for any replaced plan: none when no plan of
// the user's has started by the offer's start date, the points of the days
// before it when it is this week, and null when that isn't known yet, because
// the start date is in a later week or the points couldn't be read.
type PointsToReset = number | null;

// Whether a plan of the user's is running on day, which switching then cuts short.
function isRunningOn(plan: DietPlan | null | undefined, day: string) {
  if (!plan) {
    return false;
  }
  const { startDate, endDate } = getPlanSchedule(plan);
  // Plans saved before end dates were recorded ran for a week.
  return startDate <= day && day <= (endDate ?? addCalendarDays(startDate, 6));
}

async function getPointsToReset(offer: SharedPlanOffer): Promise<PointsToReset> {
  const dietPlans = useDietPlanStore.getState();
  if (dietPlans.planLoadedAt === null) {
    await dietPlans.fetchActivePlan();
  }
  const plan = useDietPlanStore.getState().activePlan;
  if (!isRunningOn(plan, offer.startDate) && !isRunningOn(plan?.nextPlan, offer.startDate)) {
    return 0;
  }

  try {
    const activity = await leaderboardService.getWeekActivity();
    const { periodStart, periodEndExclusive } = activity.week;
    if (offer.startDate < periodStart || offer.startDate >= periodEndExclusive) {
      return null;
    }
    return activity.days.filter((day) => day.date < offer.startDate).reduce((total, day) => total + day.points, 0);
  } catch {
    return null;
  }
}

function getOfferMessage(offer: SharedPlanOffer, points: PointsToReset) {
  const today = toCalendarDate(new Date());
  const from = offer.startDate === today ? 'today' : formatCalendarDate(offer.startDate);
  let message = `${offer.owner.displayName} started a shared plan, until ${formatCalendarDate(offer.endDate)}. If you switch, you'll eat the same meals as your group, in portions worked out for your own goal and weight and adapted to your own allergies, dislikes and diet, and it replaces your plan from ${from}.`;
  if (points === null) {
    message +=
      ' If your plan is running then, the meal, water and coffee points from your plan earlier that week are reset to zero, and those days still count towards your weekly average.';
  } else if (points > 0) {
    message += ` This resets the ${points} ${points === 1 ? 'point' : 'points'} you've earned from your plan this week to zero, and those days still count towards your weekly average.`;
  }
  return `${message} Your portions take about a minute to prepare.`;
}

// Asks whether to switch to the shared plan, with the points that would cost.
// dismissText names the button that leaves the offer waiting.
export async function askToSwitch(offer: SharedPlanOffer, options: { onSwitch: () => void; dismissText: string; withKeepOption?: boolean }) {
  const points = await getPointsToReset(offer);
  showDialog({
    title: 'Switch to the shared plan?',
    message: getOfferMessage(offer, points),
    icon: 'people-outline',
    buttons: [
      { text: 'Switch', onPress: options.onSwitch },
      ...(options.withKeepOption ? [{ text: 'Keep my plan', onPress: () => void declineSharedPlanOffer() }] : []),
      { text: options.dismissText, style: 'cancel' as const },
    ],
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

// Switches to the offered plan and says how it went. A newer shared plan may
// have replaced the offer, so a failure reloads it.
export async function acceptSharedPlanOffer() {
  try {
    if (!(await useSharedPlanOfferStore.getState().accept())) {
      return;
    }
    showDialog({
      title: "You're on the shared plan",
      message: 'You have the same meals as your group now, in portions for your own goal and weight.',
      icon: 'checkmark-circle-outline',
    });
  } catch (error) {
    if (isGenerationCancelled(error)) {
      return;
    }
    showDialog({ title: "We couldn't switch you to the shared plan", message: getErrorMessage(error), tone: 'danger' });
    void useSharedPlanOfferStore
      .getState()
      .load()
      .catch(() => undefined);
  }
}

export async function declineSharedPlanOffer() {
  try {
    await useSharedPlanOfferStore.getState().decline();
  } catch (error) {
    showDialog({ title: 'Error', message: getErrorMessage(error), tone: 'danger' });
    void useSharedPlanOfferStore
      .getState()
      .load()
      .catch(() => undefined);
  }
}
