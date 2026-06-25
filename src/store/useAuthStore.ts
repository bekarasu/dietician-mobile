import { create } from 'zustand';

import { authService } from '../services/authService';
import { tokenService } from '../services/tokenService';
import { User } from '../types/models';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  otpToken: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  verifyOTP: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start loading for bootstrap
  error: null,
  otpToken: null,

  bootstrap: async () => {
    try {
      const accessToken = await tokenService.getAccessToken();
      if (accessToken) {
        // Here we would ideally fetch the user profile with the token.
        // For now, mock it since we don't have a profile endpoint mapped yet.
        set({
          user: { id: 'user-1', email: 'user@example.com', name: 'Existing User' },
          isAuthenticated: true,
        });
      }
    } catch (e) {
      // Ignore secure store errors, just require login again
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.login(email, password);
      await tokenService.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      set({ user: response.user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed.',
      });
    }
  },

  register: async (firstName, lastName, email, password) => {
    set({ isLoading: true, error: null });

    try {
      const otpToken = await authService.register(firstName, lastName, email, password);
      set({ otpToken, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Registration failed.',
      });
    }
  },

  verifyOTP: async (otp: string) => {
    const { otpToken } = get();
    if (!otpToken) {
      set({ error: 'No OTP flow is active.' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await authService.verifyOTP(otpToken, otp);
      await tokenService.setTokens(response.tokens.accessToken, response.tokens.refreshToken);
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        otpToken: null, // Clear OTP token on success
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Verification failed.',
      });
    }
  },

  logout: async () => {
    try {
      const accessToken = await tokenService.getAccessToken();
      if (accessToken) {
        await authService.logout(accessToken);
      }
    } catch (error) {
      console.warn('Logout API failed:', error);
    } finally {
      await tokenService.clearTokens();
      set({ user: null, isAuthenticated: false, error: null, otpToken: null });
    }
  },
}));