import { useEffect, useState } from 'react';

import { useAuthStore } from '../store/useAuthStore';
import { useDailyLogStore } from '../store/useDailyLogStore';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useInventoryStore } from '../store/useInventoryStore';
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
        ]);

        // Only here, once per launch. It runs after the rest, which can still log
        // the user out, so a later user never inherits it.
        if (useAuthStore.getState().isAuthenticated && useOnboardingStore.getState().isCompleted) {
          await useDietPlanStore.getState().checkGeneration();
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