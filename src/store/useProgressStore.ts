import { create } from 'zustand';

import { progressService } from '../services/progressService';
import { FriendCompetitionEntry, ProgressEntry } from '../types/models';

interface ProgressState {
  entries: ProgressEntry[];
  friends: FriendCompetitionEntry[];
  bootstrap: () => Promise<void>;
  latestEntry: () => ProgressEntry | undefined;
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
}));