import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';

import { useNotificationStore } from '../../store/useNotificationStore';
import { theme } from '../../theme/theme';

// Nothing tells the app a notification arrived except a push, which may be off
// or unavailable, so the badge also refreshes while its screen is open.
const REFRESH_MS = 60_000;

interface NotificationBellProps {
  onPress: () => void;
  size?: number;
}

export function NotificationBell({ onPress, size = 40 }: NotificationBellProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  useFocusEffect(
    useCallback(() => {
      const refresh = () => {
        if (AppState.currentState === 'active') {
          void useNotificationStore.getState().refreshUnreadCount();
        }
      };
      refresh();

      const timer = setInterval(refresh, REFRESH_MS);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          refresh();
        }
      });
      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, []),
  );

  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { width: size, height: size, borderRadius: size / 2 }, pressed && styles.pressed]}
    >
      <Ionicons color={theme.colors.text} name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={Math.round(size * 0.5)} />
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.danger,
    // Separates the badge from the button where they overlap.
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  badgeText: {
    color: theme.colors.surface,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
  },
});
