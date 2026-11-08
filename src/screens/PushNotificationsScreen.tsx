import { Linking, Platform, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { appEnv } from '../constants/appEnv';
import {
  setPushNotificationsEnabled,
  syncPushNotifications,
  usePushNotificationStore,
} from '../features/notifications/pushNotifications';
import { theme } from '../theme/theme';

export function PushNotificationsScreen() {
  const { enabled, permission, registered, busy, error, token } = usePushNotificationStore();
  const available = permission !== 'unavailable';
  const status = !available
    ? (Platform.OS === 'ios' ? 'Notifications are not available in this build.' : 'Push notifications are not yet available on Android.')
    : !enabled ? 'Push notifications are off on this phone.'
      : permission === 'blocked' ? 'Allow notifications for Eativio in Settings.'
        : registered ? 'This phone is ready to receive notifications.'
          : busy ? 'Setting up notifications…' : 'Connect to the internet and try again.';

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.title}>Keep up with your plan</Text>
            <Text style={styles.text}>Friend requests, your weekly and monthly results, shared meal invitations and updates when your plan is ready.</Text>
          </View>
          <Switch
            accessibilityLabel="Push notifications"
            disabled={busy || !available}
            value={enabled && available && permission !== 'blocked'}
            onValueChange={(value) => { void setPushNotificationsEnabled(value); }}
            thumbColor={theme.colors.surface}
            trackColor={{ true: theme.colors.primary, false: theme.colors.border }}
          />
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.text}>{status}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {permission === 'blocked' ? (
          <AppButton title="Open Settings" variant="secondary" onPress={() => { void Linking.openSettings(); }} />
        ) : enabled && available && !registered ? (
          <AppButton title="Try again" loading={busy} variant="secondary" onPress={() => { void syncPushNotifications(true); }} />
        ) : null}
      </View>
      {appEnv.monitoring && token ? (
        <View style={styles.card}>
          <Text style={styles.title}>Test device</Text>
          <Text style={styles.text}>Use this FCM token to send a test notification from Firebase Console.</Text>
          <Text selectable style={styles.token}>{token}</Text>
          <AppButton title="Share token" variant="secondary" onPress={() => { void Share.share({ message: token }); }} />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg, padding: theme.spacing.lg, gap: theme.spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  copy: { flex: 1, gap: theme.spacing.xs },
  title: { ...theme.typography.body, fontWeight: '700', color: theme.colors.text },
  text: { ...theme.typography.body, color: theme.colors.muted },
  error: { ...theme.typography.body, color: theme.colors.danger },
  token: { ...theme.typography.caption, color: theme.colors.muted },
});
