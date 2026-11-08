import { create } from 'zustand';

import { runPlanGeneration } from '../features/dietPlan/planGeneration';
import { sharedPlanService } from '../services/sharedPlanService';
import { SharedPlanOffer } from '../types/models';
import { useDietPlanStore } from './useDietPlanStore';

interface SharedPlanOfferState {
  // The shared plan waiting for the user, null when there is none or before it loads.
  offer: SharedPlanOffer | null;
  // Switching takes about a minute, and carries on while the user moves around the app.
  isAccepting: boolean;
  // Offers the user has seen since the app opened, so the prompt asks about
  // each once per launch.
  seenOfferIds: string[];
  // seen marks the offer as seen, for a screen that shows it.
  load: (options?: { seen?: boolean }) => Promise<SharedPlanOffer | null>;
  markSeen: (offerId: string) => void;
  // Resolves true once the user's plan is the shared one, or false when there
  // was nothing to accept, a switch was already running, or the user logged
  // out meanwhile. Throws as runPlanGeneration does.
  accept: () => Promise<boolean>;
  decline: () => Promise<void>;
  // Logout calls it, so the next user never sees this offer.
  reset: () => void;
}

// Bumped by reset, so an answer that arrives after logout can't put the
// previous user's offer back.
let session = 0;

export const useSharedPlanOfferStore = create<SharedPlanOfferState>((set, get) => ({
  offer: null,
  isAccepting: false,
  seenOfferIds: [],
  load: async (options) => {
    const current = session;
    const offer = await sharedPlanService.getOffer();
    if (current !== session) {
      return null;
    }
    set((state) => ({
      offer,
      seenOfferIds: options?.seen && offer && !state.seenOfferIds.includes(offer.id) ? [...state.seenOfferIds, offer.id] : state.seenOfferIds,
    }));
    return offer;
  },
  markSeen: (offerId) =>
    set((state) => (state.seenOfferIds.includes(offerId) ? state : { seenOfferIds: [...state.seenOfferIds, offerId] })),
  accept: async () => {
    const { offer, isAccepting } = get();
    if (!offer || isAccepting) {
      return false;
    }

    const current = session;
    set({ isAccepting: true });
    try {
      await runPlanGeneration(() => sharedPlanService.acceptOffer(offer.id));
      if (current !== session) {
        return false;
      }
      set({ offer: null });
      await useDietPlanStore.getState().fetchActivePlan();
      return true;
    } finally {
      if (current === session) {
        set({ isAccepting: false });
      }
    }
  },
  decline: async () => {
    const { offer } = get();
    if (!offer) {
      return;
    }
    await sharedPlanService.declineOffer(offer.id);
    if (get().offer?.id === offer.id) {
      set({ offer: null });
    }
  },
  reset: () => {
    session += 1;
    set({ offer: null, isAccepting: false, seenOfferIds: [] });
  },
}));
