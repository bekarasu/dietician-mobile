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
  historicalHydration: HydrationEntry[];
  historicalCoffee: CoffeeEntry[];
}

import { mockHistoricalCoffee, mockHistoricalHydration } from '../services/mocks/mockData';

export const useHydrationStore = create<HydrationState>((set, get) => ({
  hydration: { date: new Date().toISOString().split('T')[0], waterMl: 0, targetWaterMl: 0 },
  coffee: { date: new Date().toISOString().split('T')[0], cups: 0, targetCups: 2 },
  historicalHydration: mockHistoricalHydration,
  historicalCoffee: mockHistoricalCoffee,
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
  // Both send only the field they change: the server keeps the rest of the day's
  // log. Resending the whole log also resent its meals, which logged them again.
  // progressService returns null rather than throwing, so null means revert.
  addWater: async (amount) => {
    const { hydration } = get();
    const newWaterMl = hydration.waterMl + amount;

    // Optimistic update
    set((state) => ({
      hydration: {
        ...state.hydration,
        waterMl: newWaterMl,
      },
    }));

    const updatedLog = await progressService.upsertDailyLog({ logDate: 'today', waterIntakeMl: newWaterMl });
    if (updatedLog) {
      set({ rawDailyLog: updatedLog });
    } else {
      set((state) => ({
        hydration: { ...state.hydration, waterMl: hydration.waterMl },
      }));
    }
  },
  addCoffee: async (cups) => {
    const { coffee } = get();
    const newCups = coffee.cups + cups;

    // Optimistic update
    set((state) => ({
      coffee: {
        ...state.coffee,
        cups: newCups,
      },
    }));

    const updatedLog = await progressService.upsertDailyLog({ logDate: 'today', coffeeCups: newCups });
    if (updatedLog) {
      set({ rawDailyLog: updatedLog });
    } else {
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