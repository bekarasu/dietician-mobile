import { create } from 'zustand';

import { isOnboardingComplete } from '../features/onboarding/validation';
import { stopPushNotifications } from '../features/notifications/pushNotifications';
import { cancelAllReminders } from '../features/reminders/mealReminders';
import { authService } from '../services/authService';
import { tokenService } from '../services/tokenService';
import { User } from '../types/models';
import { useDietPlanStore } from './useDietPlanStore';
import { useNotificationStore } from './useNotificationStore';
import { useOnboardingStore } from './useOnboardingStore';
import { useProfileStore } from './useProfileStore';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  otpToken: string | null;
  hasSeenOnboardingIntro: boolean;
  setHasSeenOnboardingIntro: () => Promise<void>;
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
  hasSeenOnboardingIntro: false,

  setHasSeenOnboardingIntro: async () => {
    try {
      const SecureStore = await import('expo-secure-store');
      // await SecureStore.setItemAsync('HAS_SEEN_ONBOARDING_INTRO', 'true');
      set({ hasSeenOnboardingIntro: true });
    } catch (e) {
      console.warn('Failed to save onboarding status', e);
    }
  },

  bootstrap: async () => {
    try {
      const SecureStore = await import('expo-secure-store');
      // const hasSeen = await SecureStore.getItemAsync('HAS_SEEN_ONBOARDING_INTRO');
      const hasSeen = false;
      set({ hasSeenOnboardingIntro: Boolean(hasSeen) });

      const accessToken = await tokenService.getAccessToken();
      if (accessToken) {
        try {
          await useProfileStore.getState().bootstrap();
        } catch (err) {
          console.warn('Failed to fetch profile during bootstrap', err);
          // If token is invalid, we might want to clear it, but let's just leave it for now
        }

        set({ isAuthenticated: true });

        const profile = useProfileStore.getState().profile;
        if (profile) {
          set({
            user: { id: profile.id, name: profile.name },
          });

          if (isOnboardingComplete(profile)) {
            useOnboardingStore.getState().restoreOnboardingState();
          }
        }
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

      try {
        await useProfileStore.getState().bootstrap();
        const profile = useProfileStore.getState().profile;
        if (isOnboardingComplete(profile)) {
          useOnboardingStore.getState().restoreOnboardingState();
        }
      } catch (err) {
        console.warn('Failed to fetch profile during login', err);
      }

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

      try {
        await useProfileStore.getState().bootstrap();
        const profile = useProfileStore.getState().profile;
        if (isOnboardingComplete(profile)) {
          useOnboardingStore.getState().restoreOnboardingState();
        }
      } catch (err) {
        console.warn('Failed to fetch profile during verifyOTP', err);
      }

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
    await stopPushNotifications();
    try {
      const accessToken = await tokenService.getAccessToken();
      if (accessToken) {
        await authService.logout(accessToken);
      }
    } catch (error) {
      console.warn('Logout API failed:', error);
    } finally {
      await tokenService.clearTokens();
      useProfileStore.getState().setProfile(null);
      // The reminders name this user's meals, and the next user would get them
      // from the plan until it reloads.
      useDietPlanStore.getState().reset();
      useNotificationStore.getState().reset();
      void cancelAllReminders();
      set({ user: null, isAuthenticated: false, error: null, otpToken: null });
    }
  },
}));
