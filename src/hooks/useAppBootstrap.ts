import { useEffect, useState } from 'react';

import { useAuthStore } from '../store/useAuthStore';
import { useDailyLogStore } from '../store/useDailyLogStore';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useMealReminderStore } from '../store/useMealReminderStore';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useProfileStore } from '../store/useProfileStore';
import { useProgressStore } from '../store/useProgressStore';

export function useAppBootstrap() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await useAuthStore.getState().bootstrap();

        await Promise.all([
          useProfileStore.getState().bootstrap(),
          useDailyLogStore.getState().bootstrap(),
          useInventoryStore.getState().bootstrap(),
          useProgressStore.getState().bootstrap(),
          // Never rejects, so it can't log anyone out.
          useMealReminderStore.getState().load(),
        ]);

        // Only here, once per launch. It runs after the rest, which can still log
        // the user out, so a later user never inherits it.
        if (useAuthStore.getState().isAuthenticated && useOnboardingStore.getState().isCompleted) {
          const generation = await useDietPlanStore.getState().checkGeneration();
          // The plan an onboarding was for ended without one while the app was
          // closed, or the app was closed on its error. Nothing of that
          // onboarding is kept then, as when it's left on screen. Reverting
          // again later in the day changes nothing.
          if (generation?.kind === 'create' && (generation.status === 'failed' || generation.status === 'cancelled')) {
            await useOnboardingStore.getState().revertAnswers().catch((error) => {
              console.error('Failed to revert onboarding answers', error);
            });
          }
        }
      } catch (error) {
        console.error('App bootstrap error:', error);
        // If bootstrapping fails (e.g., due to 401 unauthorized), clear auth state so the user isn't stuck
        await useAuthStore.getState().logout();
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  return isReady;
}