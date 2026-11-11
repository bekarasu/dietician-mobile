import { LegalAcceptance, LegalDocument } from '../types/models';
import { fetchData } from './apiClient';
import { ApiError } from './apiError';
import { withLanguageHeader } from './requestHeaders';

const API_URL = `${process.env.EXPO_PUBLIC_ACCOUNT_API_URL}/legal`;
const TIMEOUT_MS = 15_000;

interface DocumentList {
  documents: LegalDocument[] | null;
}

export const toLegalAcceptance = (document: LegalDocument): LegalAcceptance => ({
  id: document.id,
  language: document.language,
});

export const legalService = {
  // The current documents, for the registration screen. Public, as there is no
  // account yet. Empty when none are published, and then none are required.
  async getDocuments(): Promise<LegalDocument[]> {
    const response = await fetch(`${API_URL}/documents`, {
      headers: withLanguageHeader(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }
    const body = await response.json();
    return (body?.data as DocumentList | undefined)?.documents ?? [];
  },

  // Required documents with a version the signed-in user hasn't accepted, such
  // as updated terms.
  async getPending(): Promise<LegalDocument[]> {
    const data = await fetchData<DocumentList>(`${API_URL}/documents/pending`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return data?.documents ?? [];
  },

  // Records the acceptances and returns what is still pending. A text that has
  // been replaced since it was loaded is a 409.
  async accept(documents: LegalDocument[]): Promise<LegalDocument[]> {
    const data = await fetchData<DocumentList>(`${API_URL}/acceptances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documents: documents.map(toLegalAcceptance) }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return data?.documents ?? [];
  },
};
