import { BlockedUser, Friend, FriendRequestList, UserSearchResult } from '../types/models';
import { fetchData } from './apiClient';

const API_URL = `${process.env.EXPO_PUBLIC_ACCOUNT_API_URL}/friends`;

const postJson = (url: string, body: object) =>
  fetchData(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const friendService = {
  async listFriends(): Promise<Friend[]> {
    const data = await fetchData<{ friends: Friend[] }>(`${API_URL}?limit=100`);
    return data.friends;
  },

  listRequests(): Promise<FriendRequestList> {
    return fetchData<FriendRequestList>(`${API_URL}/requests?limit=100`);
  },

  async listBlocked(): Promise<BlockedUser[]> {
    const data = await fetchData<{ blocked: BlockedUser[] }>(`${API_URL}/blocks?limit=100`);
    return data.blocked;
  },

  async search(query: string): Promise<UserSearchResult[]> {
    const data = await fetchData<{ users: UserSearchResult[] }>(`${API_URL}/search?q=${encodeURIComponent(query)}`);
    return data.users;
  },

  sendRequest(userId: string) {
    return postJson(`${API_URL}/requests`, { receiverUserId: userId });
  },

  acceptRequest(requestId: string) {
    return fetchData(`${API_URL}/requests/${requestId}/accept`, { method: 'POST' });
  },

  rejectRequest(requestId: string) {
    return fetchData(`${API_URL}/requests/${requestId}/reject`, { method: 'POST' });
  },

  cancelRequest(requestId: string) {
    return fetchData(`${API_URL}/requests/${requestId}`, { method: 'DELETE' });
  },

  removeFriend(userId: string) {
    return fetchData(`${API_URL}/${userId}`, { method: 'DELETE' });
  },

  blockUser(userId: string) {
    return postJson(`${API_URL}/blocks`, { userId });
  },

  unblockUser(userId: string) {
    return fetchData(`${API_URL}/blocks/${userId}`, { method: 'DELETE' });
  },
};
