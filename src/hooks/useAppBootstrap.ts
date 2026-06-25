import { useEffect, useState } from 'react';

import { useAuthStore } from '../store/useAuthStore';
import { useDailyLogStore } from '../store/useDailyLogStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useProfileStore } from '../store/useProfileStore';
import { useProgressStore } from '../store/useProgressStore';

export function useAppBootstrap() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      await Promise.all([
        useAuthStore.getState().bootstrap(),
        useProfileStore.getState().bootstrap(),
        useDailyLogStore.getState().bootstrap(),
        useInventoryStore.getState().bootstrap(),
        useProgressStore.getState().bootstrap(),
      ]);

      if (isMounted) {
        setIsReady(true);
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  return isReady;
}