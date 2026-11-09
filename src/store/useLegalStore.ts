import { create } from 'zustand';

import { isApiError } from '../services/apiError';
import { legalService } from '../services/legalService';
import { LegalDocument } from '../types/models';

type DocumentsStatus = 'idle' | 'loading' | 'ready' | 'error';

interface LegalState {
  // The current documents, shown at registration.
  documents: LegalDocument[];
  documentsStatus: DocumentsStatus;
  // Documents the signed-in user has to accept before using the app.
  // RootNavigator shows them first while there are any.
  pending: LegalDocument[];
  loadDocuments: () => Promise<void>;
  // Never throws: when the server can't be reached, the user isn't blocked, and
  // the next launch or login asks again.
  checkPending: () => Promise<void>;
  acceptPending: (documents: LegalDocument[]) => Promise<void>;
  reset: () => void;
}

// Only the newest load may write, so a slow earlier answer can't replace it.
let documentsRequest = 0;

export const useLegalStore = create<LegalState>((set, get) => ({
  documents: [],
  documentsStatus: 'idle',
  pending: [],

  loadDocuments: async () => {
    const request = ++documentsRequest;
    // A reload, such as after a version changed, keeps the list on screen.
    if (get().documentsStatus !== 'ready') {
      set({ documentsStatus: 'loading' });
    }
    try {
      const documents = await legalService.getDocuments();
      if (request === documentsRequest) {
        set({ documents, documentsStatus: 'ready' });
      }
    } catch (error) {
      console.warn('Failed to load legal documents', error);
      if (request === documentsRequest) {
        set({ documentsStatus: 'error' });
      }
    }
  },

  checkPending: async () => {
    try {
      set({ pending: await legalService.getPending() });
    } catch (error) {
      console.warn('Failed to check pending legal documents', error);
    }
  },

  acceptPending: async (documents) => {
    try {
      set({ pending: await legalService.accept(documents) });
    } catch (error) {
      // A newer version came out while the screen was open. Show that one.
      if (isApiError(error) && error.status === 409) {
        await get().checkPending();
      }
      throw error;
    }
  },

  reset: () => {
    documentsRequest++;
    set({ documents: [], documentsStatus: 'idle', pending: [] });
  },
}));
