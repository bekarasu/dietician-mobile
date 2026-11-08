import { SharedGroup, SharedPlanInvite } from '../types/models';
import { fetchData, fetchWithAuth } from './apiClient';

const API_URL = `${process.env.EXPO_PUBLIC_RECOMMENDATION_API_URL}/diet-plans/shared`;

const postJson = <T>(url: string, body?: object) =>
  fetchData<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

// Sharing meals with friends. Failures throw the server's translated message.
// Group data stays in screen state, so it doesn't outlive a logout.
export const sharedPlanService = {
  // Null when the user isn't in a group. Anyone no longer the owner's friend,
  // or with a block against another member, has been removed by then.
  async getGroup(): Promise<SharedGroup | null> {
    const response = await fetchWithAuth(`${API_URL}/group`);
    if (response.status === 404) {
      return null;
    }

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(typeof body?.error === 'string' ? body.error : 'Failed to load shared meals');
    }
    return body.data;
  },

  async listInvites(): Promise<SharedPlanInvite[]> {
    const data = await fetchData<{ invites: SharedPlanInvite[] }>(`${API_URL}/invites`);
    return data.invites;
  },

  // Creates the user's group if they have none. The friend gets a notification.
  invite(userId: string) {
    return postJson<SharedGroup>(`${API_URL}/group/invites`, { userId });
  },

  // The owner removes a member or withdraws an invitation.
  removeMember(userId: string) {
    return fetchData(`${API_URL}/group/members/${userId}`, { method: 'DELETE' });
  },

  // The owner leaving deletes the group. Plans already made stay.
  leave() {
    return postJson(`${API_URL}/group/leave`);
  },

  acceptInvite(groupId: string) {
    return postJson<SharedGroup>(`${API_URL}/invites/${groupId}/accept`);
  },

  declineInvite(groupId: string) {
    return postJson(`${API_URL}/invites/${groupId}/decline`);
  },

  // Owner only. Takes about a minute, like any plan, so start it through
  // runPlanGeneration. Every member's plan is replaced from startDate.
  createSharedPlan(startDate: string, durationDays = 7) {
    return postJson(API_URL, { startDate, durationDays });
  },
};
