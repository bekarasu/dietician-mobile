import { t } from '../../i18n';
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
  const from = offer.startDate === today ? t('sharedPlan.offer.today') : formatCalendarDate(offer.startDate);
  const parts = [t('sharedPlan.offer.message', { name: offer.owner.displayName, end: formatCalendarDate(offer.endDate), from })];
  if (points === null) {
    parts.push(t('sharedPlan.offer.pointsUnknown'));
  } else if (points > 0) {
    parts.push(t('sharedPlan.offer.points', { count: points }));
  }
  parts.push(t('sharedPlan.offer.prepTime'));
  return parts.join(' ');
}

// Asks whether to switch to the shared plan, with the points that would cost.
// dismissText names the button that leaves the offer waiting.
export async function askToSwitch(offer: SharedPlanOffer, options: { onSwitch: () => void; dismissText: string; withKeepOption?: boolean }) {
  const points = await getPointsToReset(offer);
  showDialog({
    title: t('sharedPlan.offer.title'),
    message: getOfferMessage(offer, points),
    icon: 'people-outline',
    buttons: [
      { text: t('sharedPlan.offer.switch'), onPress: options.onSwitch },
      ...(options.withKeepOption ? [{ text: t('sharedPlan.offerCard.keep'), onPress: () => void declineSharedPlanOffer() }] : []),
      { text: options.dismissText, style: 'cancel' as const },
    ],
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : t('common.errors.generic');
}

// Switches to the offered plan and says how it went. A newer shared plan may
// have replaced the offer, so a failure reloads it.
export async function acceptSharedPlanOffer() {
  try {
    if (!(await useSharedPlanOfferStore.getState().accept())) {
      return;
    }
    showDialog({
      title: t('sharedPlan.offer.acceptedTitle'),
      message: t('sharedPlan.offer.acceptedMessage'),
      icon: 'checkmark-circle-outline',
    });
  } catch (error) {
    if (isGenerationCancelled(error)) {
      return;
    }
    showDialog({ title: t('sharedPlan.offer.acceptFailed'), message: getErrorMessage(error), tone: 'danger' });
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
    showDialog({ title: t('common.errors.title'), message: getErrorMessage(error), tone: 'danger' });
    void useSharedPlanOfferStore
      .getState()
      .load()
      .catch(() => undefined);
  }
}
