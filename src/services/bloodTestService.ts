import { BloodTestUpload, UploadDetailResponse } from '../types/models';
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
  },

  async getUploadDetail(id: string): Promise<UploadDetailResponse> {
    const response = await fetchWithAuth(`${API_URL}/${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch upload details');
    }

    const json = await response.json();
    return json.data;
  },

  async toggleVisibility(id: string, isHidden: boolean): Promise<void> {
    const response = await fetchWithAuth(`${API_URL}/${id}/visibility`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isHidden }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'No response body');
      throw new Error(`Failed to update visibility (Status: ${response.status} ${response.statusText}): ${text}`);
    }
  }
};