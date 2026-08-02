import { BloodTestUpload } from '../types/models';
import { fetchWithAuth } from './apiClient';

const API_URL = `${process.env.EXPO_PUBLIC_MEDICAL_API_URL}/uploads`;

export const bloodTestService = {
  async uploadBloodTest(fileUri: string, fileName: string, mimeType: string): Promise<BloodTestUpload> {
    const formData = new FormData();
    formData.append('uploadType', 'BloodTest');
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await fetchWithAuth(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload blood test');
    }

    const json = await response.json();
    return json.data;
  },

  async listUploads(): Promise<BloodTestUpload[]> {
    const response = await fetchWithAuth(API_URL);

    if (!response.ok) {
      throw new Error('Failed to fetch uploads');
    }

    const json = await response.json();
    return json.data || [];
  }
};