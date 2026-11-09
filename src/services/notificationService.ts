import { NotificationPage } from '../types/models';
import { fetchData } from './apiClient';

// notification-service keeps every notification sent to the user. Its API is a
// separate process from the worker that sends them.
const API_URL = `${process.env.EXPO_PUBLIC_NOTIFICATION_API_URL}/notifications`;

export const NOTIFICATION_PAGE_SIZE = 20;

const timeout = () => AbortSignal.timeout(10_000);

export const notificationService = {
  // Without a cursor, the newest page. Pass the previous page's nextCursor for the next.
  list(cursor?: string): Promise<NotificationPage> {
    const query = new URLSearchParams({ limit: String(NOTIFICATION_PAGE_SIZE) });
    if (cursor) {
      query.set('cursor', cursor);
    }
    return fetchData<NotificationPage>(`${API_URL}?${query}`, { signal: timeout() });
  },

  async getUnreadCount(): Promise<number> {
    const { unreadCount } = await fetchData<{ unreadCount: number }>(`${API_URL}/unread-count`, { signal: timeout() });
    return unreadCount;
  },

  // Returns the unread count afterwards. Marking one already read is fine; an
  // unknown or someone else's ID throws.
  async markRead(id: string): Promise<number> {
    const { unreadCount } = await fetchData<{ unreadCount: number }>(`${API_URL}/${encodeURIComponent(id)}/read`, {
      method: 'POST',
      signal: timeout(),
    });
    return unreadCount;
  },

  // Returns the unread count afterwards, above 0 only if one arrived meanwhile.
  async markAllRead(): Promise<number> {
    const { unreadCount } = await fetchData<{ unreadCount: number }>(`${API_URL}/read-all`, {
      method: 'POST',
      signal: timeout(),
    });
    return unreadCount;
  },
};
