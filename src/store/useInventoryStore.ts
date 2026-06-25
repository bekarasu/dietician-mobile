import { create } from 'zustand';

import { mockInventory } from '../services/mocks/mockData';
import { RefrigeratorItem, RefrigeratorItemInput } from '../types/models';

interface InventoryState {
  items: RefrigeratorItem[];
  bootstrap: () => Promise<void>;
  addItem: (payload: RefrigeratorItemInput) => void;
  removeItem: (itemId: string) => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  items: [],
  bootstrap: async () => {
    set({ items: mockInventory });
  },
  addItem: (payload) => {
    const newItem: RefrigeratorItem = {
      id: String(Date.now()),
      ...payload,
    };

    set((state) => ({ items: [newItem, ...state.items] }));
  },
  removeItem: (itemId) => {
    set((state) => ({ items: state.items.filter((item) => item.id !== itemId) }));
  },
}));