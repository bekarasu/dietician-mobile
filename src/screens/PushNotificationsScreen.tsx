import { Linking, Platform, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { appEnv } from '../constants/appEnv';
import {
  setPushNotificationsEnabled,
  syncPushNotifications,
  usePushNotificationStore,
} from '../features/notifications/pushNotifications';
import { t } from '../i18n';
import { theme } from '../theme/theme';

export function PushNotificationsScreen() {
  const { enabled, permission, registered, busy, error, token } = usePushNotificationStore();
  const available = permission !== 'unavailable';
  const status = !available
    ? (Platform.OS === 'ios' ? t('notifications.push.unavailableIos') : t('notifications.push.unavailableAndroid'))
    : !enabled ? t('notifications.push.off')
      : permission === 'blocked' ? t('notifications.push.blocked')
        : registered ? t('notifications.push.ready')
          : busy ? t('notifications.push.settingUp') : t('notifications.push.offline');

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={styles.title}>{t('notifications.push.title')}</Text>
            <Text style={styles.text}>{t('notifications.push.text')}</Text>
          </View>
          <Switch
            accessibilityLabel={t('notifications.push.switchA11y')}
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
          <AppButton title={t('common.actions.openSettings')} variant="secondary" onPress={() => { void Linking.openSettings(); }} />
        ) : enabled && available && !registered ? (
          <AppButton title={t('common.actions.tryAgain')} loading={busy} variant="secondary" onPress={() => { void syncPushNotifications(true); }} />
        ) : null}
      </View>
      {appEnv.monitoring && token ? (
        <View style={styles.card}>
          <Text style={styles.title}>{t('notifications.push.testTitle')}</Text>
          <Text style={styles.text}>{t('notifications.push.testText')}</Text>
          <Text selectable style={styles.token}>{token}</Text>
          <AppButton title={t('notifications.push.shareToken')} variant="secondary" onPress={() => { void Share.share({ message: token }); }} />
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
