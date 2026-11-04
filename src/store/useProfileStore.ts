import { create } from 'zustand';

import { PreferenceChanges, ProfileDetails, profileService } from '../services/profileService';
import { UserProfile } from '../types/models';

interface ProfileState {
  profile: UserProfile | null;
  bootstrap: () => Promise<void>;
  // Reloads the profile, so weight and server-set targets are current. Throws on failure.
  refresh: () => Promise<void>;
  updateDetails: (details: ProfileDetails) => Promise<void>;
  updatePreferences: (changes: PreferenceChanges) => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  bootstrap: async () => {
    if (get().profile) return;
    const profile = await profileService.getProfile();
    set({ profile });
  },
  refresh: async () => {
    const profile = await profileService.getProfile();
    set({ profile });
  },
  // Both apply what was saved on top of the profile held now, rather than
  // replacing it with a copy that may be older.
  updateDetails: async (details) => {
    await profileService.updateDetails(details);
    set((state) => ({ profile: state.profile ? { ...state.profile, ...details } : state.profile }));
  },
  updatePreferences: async (changes) => {
    await profileService.updatePreferences(changes);
    set((state) => ({ profile: state.profile ? { ...state.profile, ...changes } : state.profile }));
  },
  setProfile: (profile) => {
    set({ profile });
  },
}));
