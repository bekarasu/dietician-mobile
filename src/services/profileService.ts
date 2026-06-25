import { mockProfile } from './mocks/mockData';
import { UserProfile } from '../types/models';

export const profileService = {
  async getProfile() {
    return mockProfile;
  },

  async updateProfile(profile: UserProfile) {
    return profile;
  },
};