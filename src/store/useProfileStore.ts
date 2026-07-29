import { create } from 'zustand';

import { profileService } from '../services/profileService';
import { UserProfile } from '../types/models';

interface ProfileState {
  profile: UserProfile | null;
  bootstrap: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  setProfile: (profile: UserProfile) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  bootstrap: async () => {
    const profile = await profileService.getProfile();
    set({ profile });
  },
  updateProfile: async (profile) => {
    const savedProfile = await profileService.updateProfile(profile);
    set({ profile: savedProfile });
  },
  setProfile: (profile) => {
    set({ profile });
  },
}));