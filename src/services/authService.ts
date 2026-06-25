import { User } from '../types/models';

const API_URL = 'http://localhost:8081/api/v1/auth';

// Helper to handle fetch responses
const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.message || 'API request failed');
  }
  return data;
};

// For now, our backend endpoints don't return full user objects from auth calls,
// they return tokens. We'll simulate the user object for UI consistency
// until there's a profile endpoint to fetch the user.
const buildUser = (email: string, name?: string): User => ({
  id: 'user-1',
  email,
  name: name ?? 'User',
});

export const authService = {
  async register(firstName: string, lastName: string, email: string, password: string) {
    if (!firstName || !lastName || !email || !password) {
      throw new Error('All fields are required.');
    }

    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, firstName, lastName }),
    });

    const data = await handleResponse(response);
    // Returns OTPToken
    return data.data.otp_token || data.data.OTPToken; 
  },

  async verifyOTP(otpToken: string, otp: string) {
    const response = await fetch(`${API_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp_token: otpToken, otp }), // Using standard snake case, adjust if needed
    });

    const data = await handleResponse(response);
    return {
      tokens: {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      },
      // Since verify doesn't return user details, we'll mock it for now
      user: buildUser('verified@user.com', 'Verified User'), 
    };
  },

  async login(email: string, password: string) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await handleResponse(response);
    return {
      tokens: {
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken,
      },
      user: buildUser(email),
    };
  },

  async refresh(refreshToken: string) {
    const response = await fetch(`${API_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await handleResponse(response);
    return {
      accessToken: data.data.accessToken,
      refreshToken: data.data.refreshToken,
    };
  },

  async logout(accessToken: string) {
    const response = await fetch(`${API_URL}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return await handleResponse(response);
  },
};