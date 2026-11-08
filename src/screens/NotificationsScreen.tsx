import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { showDialog } from '../features/dialog/dialogStore';
import { openNotification } from '../features/notifications/openNotification';
import { AppStackParamList } from '../navigation/navigationTypes';
import { notificationService } from '../services/notificationService';
import { useNotificationStore } from '../store/useNotificationStore';
import { theme } from '../theme/theme';
import { AppNotification } from '../types/models';
import { formatRelativeTime } from '../utils/date';

const LOAD_ERROR = 'We couldn\'t load your notifications. Please try again.';

interface NotificationLook {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
}

const LOOKS: Record<string, NotificationLook> = {
  friendship: { icon: 'people-outline', color: theme.colors.primary, background: theme.colors.primarySoft },
  sharedplan: { icon: 'restaurant-outline', color: theme.colors.primary, background: theme.colors.primarySoft },
  dietplan: { icon: 'calendar-outline', color: theme.colors.water, background: theme.colors.waterSoft },
  score: { icon: 'trophy-outline', color: '#8A6100', background: '#FDF3D1' },
};

const FAILED_LOOK: NotificationLook = { icon: 'alert-circle-outline', color: theme.colors.danger, background: theme.colors.dangerSoft };
const DEFAULT_LOOK: NotificationLook = { icon: 'notifications-outline', color: theme.colors.muted, background: theme.colors.secondarySurface };

// Types are "<area>.<event>", and the area picks the icon.
function getLook(type: string) {
  if (type === 'dietplan.failed') {
    return FAILED_LOOK;
  }
  return LOOKS[type.split('.')[0]] ?? DEFAULT_LOOK;
}

export function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [failed, setFailed] = useState(false);

  // Only the latest request may update the list, so a slow first page can't
  // replace one loaded by a refresh.
  const latestRequest = useRef(0);

  // Loads the newest page, which also brings the unread count up to date.
  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const page = await notificationService.list();
      if (request === latestRequest.current) {
        setNotifications(page.notifications);
        setNextCursor(page.nextCursor);
        setFailed(false);
        useNotificationStore.getState().setUnreadCount(page.unreadCount);
      }
    } catch {
      if (request === latestRequest.current) {
        setFailed(true);
      }
    } finally {
      if (request === latestRequest.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Loaded once: coming back from a notification keeps the pages already
  // loaded, and pulling down shows what arrived since.
  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const retry = () => {
    setIsLoading(true);
    setFailed(false);
    void load();
  };

  const loadMore = async () => {
    if (!nextCursor) {
      return;
    }

    const request = ++latestRequest.current;
    setIsLoadingMore(true);
    try {
      const page = await notificationService.list(nextCursor);
      if (request === latestRequest.current) {
        setNotifications((current) => {
          const shown = new Set(current.map((notification) => notification.id));
          return [...current, ...page.notifications.filter((notification) => !shown.has(notification.id))];
        });
        setNextCursor(page.nextCursor);
        useNotificationStore.getState().setUnreadCount(page.unreadCount);
      }
    } catch {
      if (request === latestRequest.current) {
        showDialog({ title: 'Error', message: LOAD_ERROR, tone: 'danger' });
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  const markAllRead = useCallback(async () => {
    setIsMarkingAll(true);
    try {
      const count = await notificationService.markAllRead();
      const now = new Date().toISOString();
      setNotifications((current) => current.map((notification) => (notification.readAt ? notification : { ...notification, readAt: now })));
      useNotificationStore.getState().setUnreadCount(count);
    } catch {
      showDialog({ title: 'Error', message: 'We couldn\'t mark your notifications as read. Please try again.', tone: 'danger' });
    } finally {
      setIsMarkingAll(false);
    }
  }, []);

  useLayoutEffect(() => {
    const disabled = unreadCount === 0 || isMarkingAll;
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={8}
          onPress={() => { void markAllRead(); }}
        >
          <Text style={[styles.headerAction, disabled && styles.headerActionDisabled]}>Mark all read</Text>
        </Pressable>
      ),
    });
  }, [navigation, unreadCount, isMarkingAll, markAllRead]);

  // Marks it read straight away; if the server can't be reached, the next load
  // shows it unread again.
  const open = (notification: AppNotification) => {
    if (!notification.readAt) {
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, readAt: now } : item)));
      void useNotificationStore.getState().markRead(notification.id);
    }
    openNotification(navigation, notification.data);
  };

  return (
    <ScreenContainer
      scrollViewProps={{
        refreshControl: <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={theme.colors.primary} />,
      }}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={styles.loading} />
      ) : failed && notifications.length === 0 ? (
        <View style={styles.message}>
          <Text style={styles.messageText}>{LOAD_ERROR}</Text>
          <AppButton title="Try again" variant="secondary" onPress={retry} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.message}>
          <View style={styles.emptyIcon}>
            <Ionicons color={theme.colors.muted} name="notifications-outline" size={28} />
          </View>
          <Text style={styles.messageTitle}>No notifications yet</Text>
          <Text style={styles.messageText}>Friend requests, your weekly and monthly results and plan updates will show up here.</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            {notifications.map((notification, index) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                first={index === 0}
                onPress={() => open(notification)}
              />
            ))}
          </View>
          {nextCursor ? (
            <AppButton title="Show more" variant="secondary" loading={isLoadingMore} onPress={() => { void loadMore(); }} />
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}

interface NotificationRowProps {
  notification: AppNotification;
  first: boolean;
  onPress: () => void;
}

function NotificationRow({ notification, first, onPress }: NotificationRowProps) {
  const look = getLook(notification.type);
  const unread = !notification.readAt;
  const time = formatRelativeTime(notification.createdAt);

  return (
    <Pressable
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${notification.title}. ${notification.body}. ${time}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !first && styles.rowDivider, pressed && styles.rowPressed]}
    >
      <View style={[styles.icon, { backgroundColor: look.background }]}>
        <Ionicons color={look.color} name={look.icon} size={20} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.title, unread && styles.titleUnread]}>{notification.title}</Text>
        <Text style={styles.body}>{notification.body}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: theme.spacing.xl,
  },
  headerAction: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  headerActionDisabled: {
    color: theme.colors.muted,
    opacity: 0.6,
  },
  message: {
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.secondarySurface,
  },
  messageTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
  },
  messageText: {
    ...theme.typography.body,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  rowPressed: {
    opacity: 0.7,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  titleUnread: {
    fontWeight: '800',
  },
  body: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    ...theme.typography.caption,
    color: theme.colors.muted,
    marginTop: 2,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 8,
    backgroundColor: theme.colors.primary,
  },
});
