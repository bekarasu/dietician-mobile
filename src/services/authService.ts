import { LegalAcceptance, User } from '../types/models';
import { t } from '../i18n';
import { ApiError } from './apiError';
import { withLanguageHeader } from './requestHeaders';

const API_URL = `${process.env.EXPO_PUBLIC_ACCOUNT_API_URL}/auth`;

// Helper to handle fetch responses. Throws an ApiError, so callers can tell
// statuses apart.
const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    let errorMessage = t('common.errors.generic');
    if (typeof data.error === 'string') {
      errorMessage = data.error;
    } else if (data.error?.message) {
      errorMessage = data.error.message;
    } else if (data.message) {
      errorMessage = data.message;
    }
    throw new ApiError(errorMessage, response.status, typeof data.requestId === 'string' ? data.requestId : undefined);
  }
  return data;
};

// For now, our backend endpoints don't return full user objects from auth calls,
// they return tokens. We'll simulate the user object for UI consistency
// until there's a profile endpoint to fetch the user.
const buildUser = (email: string, name?: string): User => ({
  id: 'user-1',
  name: name ?? 'User',
});

export const authService = {
  // acceptedDocuments must hold every required legal document. A 409 means one
  // was replaced by a newer version after it was loaded.
  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    acceptedDocuments: LegalAcceptance[],
  ) {
    if (!firstName || !lastName || !email || !password) {
      throw new Error(t('auth.errors.allFieldsRequired'));
    }

    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: withLanguageHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email, password, firstName, lastName, acceptedDocuments }),
    });

    const data = await handleResponse(response);
    // Returns OTPToken
    return data?.data?.otpToken;
  },

  async verifyOTP(otpToken: string, otp: string) {
    const response = await fetch(`${API_URL}/verify-otp`, {
      method: 'POST',
      headers: withLanguageHeader({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ otpToken, otp }),
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
      throw new Error(t('auth.errors.emailPasswordRequired'));
    }

    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: withLanguageHeader({ 'Content-Type': 'application/json' }),
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
      headers: withLanguageHeader({ 'Content-Type': 'application/json' }),
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
      headers: withLanguageHeader({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      }),
    });

    return await handleResponse(response);
  },
};