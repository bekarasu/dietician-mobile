import { BlockedUser, Friend, FriendRequestList, PublicProfile, UserSearchResponse } from '../types/models';
import { fetchData, fetchWithAuth } from './apiClient';

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

  // Eight digits are a friend code, text with an @ a whole email address, and
  // anything else part of a name; matchType says which the server ran.
  async search(query: string): Promise<UserSearchResponse> {
    const data = await fetchData<UserSearchResponse>(`${API_URL}/search?q=${encodeURIComponent(query)}`);
    return { matchType: data.matchType ?? 'NAME', users: data.users };
  },

  // The user's own code, which never changes, for others to search for.
  async getFriendCode(): Promise<string> {
    const data = await fetchData<{ friendCode: string }>(`${API_URL}/code`);
    return data.friendCode;
  },

  // Null when the user no longer exists or either of you has blocked the other;
  // the server gives both the same 404, so a block can't be detected.
  async getProfile(userId: string): Promise<PublicProfile | null> {
    const response = await fetchWithAuth(`${API_URL}/users/${userId}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    const json = await response.json();
    return json.data;
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
