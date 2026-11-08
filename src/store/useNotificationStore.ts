import { create } from 'zustand';

import { notificationService } from '../services/notificationService';

interface NotificationState {
  // Unread notifications in the inbox, for the bell's badge.
  unreadCount: number;
  // A failure keeps the last count: the badge is a hint, not worth an error.
  refreshUnreadCount: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  // Marks one read on the server and takes the count it returns. Reports
  // whether that worked.
  markRead: (id: string) => Promise<boolean>;
  // Called at logout.
  reset: () => void;
}

// Bumped by reset, so an answer that arrives after logout can't put the
// previous user's count back.
let session = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,

  refreshUnreadCount: async () => {
    const current = session;
    try {
      const unreadCount = await notificationService.getUnreadCount();
      if (current === session) {
        set({ unreadCount });
      }
    } catch (error) {
      console.warn('Could not load the unread notification count', error);
    }
  },

  setUnreadCount: (unreadCount) => set({ unreadCount }),

  markRead: async (id) => {
    const current = session;
    try {
      const unreadCount = await notificationService.markRead(id);
      if (current === session) {
        set({ unreadCount });
      }
      return true;
    } catch (error) {
      console.warn('Could not mark the notification read', error);
      return false;
    }
  },

  reset: () => {
    session += 1;
    set({ unreadCount: 0 });
  },
}));
