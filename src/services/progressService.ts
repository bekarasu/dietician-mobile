import { mockFriends, mockProgressEntries } from './mocks/mockData';

export const progressService = {
  async getProgressEntries() {
    return mockProgressEntries;
  },

  async getFriendCompetition() {
    return mockFriends;
  },
};