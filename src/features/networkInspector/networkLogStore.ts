import { create } from 'zustand';

export type NetworkHeaders = [name: string, value: string][];

export interface NetworkEntry {
  id: number;
  method: string;
  url: string;
  startedAt: number;
  state: 'pending' | 'done' | 'failed';
  status?: number;
  // Time until the response headers arrived. Body reading is not included.
  durationMs?: number;
  requestHeaders: NetworkHeaders;
  requestBody?: string;
  responseHeaders: NetworkHeaders;
  // Undefined while the body is still being read.
  responseBody?: string;
  error?: string;
}

// Keeps memory bounded during long dev sessions.
const MAX_ENTRIES = 200;

// Lives beside the entries so ids stay unique when Fast Refresh re-runs the logger.
let nextId = 1;

interface NetworkLogState {
  // Newest first.
  entries: NetworkEntry[];
  // Returns the new entry's id.
  add: (entry: Omit<NetworkEntry, 'id'>) => number;
  update: (id: number, changes: Partial<NetworkEntry>) => void;
  clear: () => void;
}

// Debug tooling, not user data, so logout does not reset it: the logout calls
// themselves are often what is being inspected.
export const useNetworkLogStore = create<NetworkLogState>((set) => ({
  entries: [],

  add: (entry) => {
    const id = nextId++;
    set((state) => ({ entries: [{ ...entry, id }, ...state.entries].slice(0, MAX_ENTRIES) }));
    return id;
  },

  update: (id, changes) =>
    set((state) => ({
      entries: state.entries.map((entry) => (entry.id === id ? { ...entry, ...changes } : entry)),
    })),

  clear: () => set({ entries: [] }),
}));
