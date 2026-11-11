import { AppState, NativeEventSubscription } from 'react-native';

import { recommendationService } from '../../services/recommendationService';
import { t } from '../../i18n';
import { PlanGeneration, PlanGenerationStatus } from '../../types/models';

const POLL_INTERVAL_MS = 3000;
// Checks in a row that can fail, or find no generation for a request still
// waiting, before the app stops following. The server finishes the plan either
// way, and the plan screens show it once saved.
const MAX_IDLE_CHECKS = 5;

const CANCELLED_ERROR_NAME = 'GenerationCancelled';

export const getGenerationDetail = () => t('dietPlan.generation.detail');

type Outcome = { ok: true } | { ok: false; error: unknown };

// The error for a generation that ended without saving a plan.
function generationError(status: PlanGenerationStatus) {
  if (status !== 'cancelled') {
    return new Error(t('dietPlan.generation.failed'));
  }
  const error = new Error(t('dietPlan.generation.cancelled'));
  error.name = CANCELLED_ERROR_NAME;
  return error;
}

// Whether waiting for a generation failed because it was cancelled, on this
// device or another. Screens move on then instead of showing an error.
export function isGenerationCancelled(error: unknown) {
  return error instanceof Error && error.name === CANCELLED_ERROR_NAME;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// iOS pauses the app in the background anyway, but Android would keep polling.
function untilForeground() {
  return new Promise<void>((resolve) => {
    if (AppState.currentState !== 'background') {
      resolve();
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        subscription.remove();
        resolve();
      }
    });
  });
}

// Waits for the request, or until the app comes back from the background,
// where iOS suspends it and the request can stall for good.
async function untilSettledOrResumed(request: Promise<void>) {
  let wasInBackground = AppState.currentState === 'background';
  let subscription: NativeEventSubscription | undefined;
  const resumed = new Promise<void>((resolve) => {
    subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        wasInBackground = true;
      } else if (state === 'active' && wasInBackground) {
        resolve();
      }
    });
  });

  try {
    await Promise.race([request, resumed]);
  } finally {
    subscription?.remove();
  }
}

// Runs a request that generates a plan (create, renew, or update) and resolves
// once the plan is saved. It takes about a minute, and if the app goes to the
// background meanwhile, the request can fail or never answer while the server
// carries on and saves the plan. So when the request fails, or the app comes
// back, this follows the generation on the server instead, and throws if it
// failed or was cancelled.
export async function runPlanGeneration(start: () => Promise<unknown>): Promise<void> {
  // The request only answers at the end, so the generation it starts is the
  // first one newer than this. Without it, the request is all there is to go by.
  const previous = await recommendationService.getPlanGeneration().catch(() => undefined);

  let outcome = null as Outcome | null;
  const request = start().then(
    () => {
      outcome = { ok: true };
    },
    (error) => {
      outcome = { ok: false, error };
    },
  );

  if (previous === undefined) {
    await request;
  } else {
    await untilSettledOrResumed(request);
  }
  if (outcome?.ok) {
    return;
  }
  if (previous === undefined) {
    throw outcome?.error;
  }

  // Whether the server has shown the generation this request started.
  let isFollowing = false;
  let idleChecks = 0;
  for (;;) {
    await untilForeground();
    const generation = await recommendationService.getPlanGeneration().catch(() => undefined);
    if (outcome?.ok) {
      return;
    }

    if (generation && generation.id !== previous?.id) {
      if (generation.status === 'completed') {
        return;
      }
      if (generation.status !== 'running') {
        throw generationError(generation.status);
      }
      isFollowing = true;
      idleChecks = 0;
    } else if (generation !== undefined && isFollowing) {
      // It expired before finishing, which happens when its server stops.
      throw new Error(t('dietPlan.generation.failed'));
    } else if (generation !== undefined && outcome) {
      // The request failed before starting a generation, such as with a 409.
      throw outcome.error;
    } else if (++idleChecks >= MAX_IDLE_CHECKS) {
      throw outcome ? outcome.error : new Error(t('dietPlan.generation.failed'));
    }

    // A request still waiting can answer before the next check.
    const nextCheck = delay(POLL_INTERVAL_MS);
    await (outcome ? nextCheck : Promise.race([nextCheck, request]));
  }
}

// Polls a generation found running, while the app is in the foreground, and
// resolves once it has saved its plan. Otherwise it throws as runPlanGeneration
// does.
export async function waitForGeneration(id: string): Promise<void> {
  let failedChecks = 0;
  for (;;) {
    await delay(POLL_INTERVAL_MS);
    await untilForeground();

    let generation: PlanGeneration | null;
    try {
      generation = await recommendationService.getPlanGeneration();
      failedChecks = 0;
    } catch (e) {
      if (++failedChecks >= MAX_IDLE_CHECKS) {
        throw e;
      }
      continue;
    }

    if (generation?.id !== id) {
      // It expired before finishing, which happens when its server stops.
      throw generationError('failed');
    }
    if (generation.status === 'completed') {
      return;
    }
    if (generation.status !== 'running') {
      throw generationError(generation.status);
    }
  }
}
