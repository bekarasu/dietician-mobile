import { create } from 'zustand';

import { progressService } from '../services/progressService';
import { FriendCompetitionEntry, ProgressEntry } from '../types/models';

interface ProgressState {
  entries: ProgressEntry[];
  friends: FriendCompetitionEntry[];
  bootstrap: () => Promise<void>;
  latestEntry: () => ProgressEntry | undefined;
  addWeightLog: (weightKg: number, notes?: string) => Promise<void>;
  removeWeightLog: (id: string) => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  entries: [],
  friends: [],
  bootstrap: async () => {
    const [entries, friends] = await Promise.all([
      progressService.getProgressEntries(),
      progressService.getFriendCompetition(),
    ]);

    set({ entries, friends });
  },
  latestEntry: () => {
    const entries = get().entries;
    return entries[entries.length - 1];
  },
  addWeightLog: async (weightKg: number, notes?: string) => {
    const newEntry = await progressService.addWeightEntry(weightKg, notes);
    if (newEntry) {
      set((state) => ({
        entries: [...state.entries, newEntry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      }));
    }
  },
  removeWeightLog: async (id: string) => {
    const success = await progressService.removeWeightEntry(id);
    if (success) {
      set((state) => ({
        entries: state.entries.filter((entry) => entry.id !== id),
      }));
    }
  },
}));