import { create } from 'zustand';

import { mockCoffee, mockHydration } from '../services/mocks/mockData';
import { CoffeeEntry, HydrationEntry } from '../types/models';

interface HydrationState {
  hydration: HydrationEntry;
  coffee: CoffeeEntry;
  addWater: (amount: number) => void;
  addCoffee: (cups: number) => void;
  setTargets: (targetWaterMl: number, targetCoffeeCups: number) => void;
}

export const useHydrationStore = create<HydrationState>((set) => ({
  hydration: mockHydration,
  coffee: mockCoffee,
  addWater: (amount) => {
    set((state) => ({
      hydration: {
        ...state.hydration,
        waterMl: state.hydration.waterMl + amount,
      },
    }));
  },
  addCoffee: (cups) => {
    set((state) => ({
      coffee: {
        ...state.coffee,
        cups: state.coffee.cups + cups,
      },
    }));
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