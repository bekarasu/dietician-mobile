import { fetchWithAuth } from './apiClient';

const API_URL = `${process.env.EXPO_PUBLIC_ACCOUNT_API_URL}/devices`;

async function updateDevice(method: 'PUT' | 'DELETE', body: { token: string; platform?: 'ios' | 'android' }) {
  const response = await fetchWithAuth(API_URL, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Device registration failed (${response.status})`);
  }
}

export const deviceService = {
  register: (token: string, platform: 'ios' | 'android') => updateDevice('PUT', { token, platform }),
  unregister: (token: string) => updateDevice('DELETE', { token }),
};
