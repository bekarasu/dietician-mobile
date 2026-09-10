import { create } from 'zustand';

import { progressService } from '../services/progressService';
import { CoffeeEntry, HydrationEntry } from '../types/models';

interface HydrationState {
  hydration: HydrationEntry;
  coffee: CoffeeEntry;
  rawDailyLog: any | null;
  bootstrap: () => Promise<void>;
  addWater: (amount: number) => Promise<void>;
  addCoffee: (cups: number) => Promise<void>;
  setTargets: (targetWaterMl: number, targetCoffeeCups: number) => void;
}

export const useHydrationStore = create<HydrationState>((set, get) => ({
  hydration: { date: new Date().toISOString().split('T')[0], waterMl: 0, targetWaterMl: 0 },
  coffee: { date: new Date().toISOString().split('T')[0], cups: 0, targetCups: 2 },
  rawDailyLog: null,
  bootstrap: async () => {
    try {
      const log = await progressService.getDailyLog('today');
      if (log) {
        set((state) => ({
          rawDailyLog: log,
          hydration: { ...state.hydration, waterMl: log.waterIntakeMl || 0 },
          coffee: { ...state.coffee, cups: log.coffeeCups || 0 },
        }));
      }
    } catch (e) {
      console.error('Failed to bootstrap hydration store', e);
    }
  },
  addWater: async (amount) => {
    const { hydration, rawDailyLog } = get();
    const newWaterMl = hydration.waterMl + amount;
    
    // Optimistic update
    set((state) => ({
      hydration: {
        ...state.hydration,
        waterMl: newWaterMl,
      },
    }));

    // Send to backend
    try {
      const updatedLog = await progressService.upsertDailyLog({
        ...(rawDailyLog || {}),
        logDate: 'today',
        waterIntakeMl: newWaterMl,
      });
      if (updatedLog) {
        set({ rawDailyLog: updatedLog });
      }
    } catch (e) {
      // Revert if failed
      set((state) => ({
        hydration: { ...state.hydration, waterMl: hydration.waterMl },
      }));
    }
  },
  addCoffee: async (cups) => {
    const { coffee, rawDailyLog } = get();
    const newCups = coffee.cups + cups;

    // Optimistic update
    set((state) => ({
      coffee: {
        ...state.coffee,
        cups: newCups,
      },
    }));

    // Send to backend
    try {
      const updatedLog = await progressService.upsertDailyLog({
        ...(rawDailyLog || {}),
        logDate: 'today',
        coffeeCups: newCups,
      });
      if (updatedLog) {
        set({ rawDailyLog: updatedLog });
      }
    } catch (e) {
      // Revert if failed
      set((state) => ({
        coffee: { ...state.coffee, cups: coffee.cups },
      }));
    }
  },
  setTargets: (targetWaterMl, targetCoffeeCups) => {
    set((state) => ({
      hydration: {
        ...state.hydration,
        targetWaterMl,
      },
      coffee: {
        ...state.coffee,
        targetCups: targetCoffeeCups,
      },
    }));
  },
}));