import { BloodTestUpload } from '../types/models';

// Future production work should encrypt these payloads, isolate storage, and log explicit consent.
export const bloodTestService = {
  async createPlaceholderUpload(fileName: string): Promise<BloodTestUpload> {
    return {
      id: String(Date.now()),
      fileName,
      uploadedAt: new Date().toISOString(),
      status: 'pending',
      note: 'Placeholder upload recorded. Clinical interpretation is intentionally out of scope for this boilerplate.',
      disclaimerAcknowledged: true,
    };
  },
};