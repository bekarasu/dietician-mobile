import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { appEnv, describeBuild } from '../../constants/appEnv';
import { theme } from '../../theme/theme';
import { formatDateTimeLabel } from '../../utils/date';

const MONOSPACE = Platform.select({ ios: 'Menlo', default: 'monospace' });

// Which env file and servers this bundle talks to. Collapsed to one line so
// the request list keeps the room.
export function EnvironmentCard() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: isExpanded }}
      onPress={() => setIsExpanded((value) => !value)}
      style={styles.card}
    >
      <View style={styles.summary}>
        <Ionicons color={theme.colors.primary} name="server-outline" size={16} />
        <Text numberOfLines={1} style={styles.summaryText}>
          {describeBuild()}
        </Text>
        <Ionicons color={theme.colors.muted} name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} />
      </View>

      {isExpanded ? (
        <View style={styles.details}>
          {appEnv.apiUrls.map(([label, url]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text selectable style={[styles.value, url ? undefined : styles.missing]}>
                {url ?? 'Not set'}
              </Text>
            </View>
          ))}
          {appEnv.builtAt ? (
            <View style={styles.row}>
              <Text style={styles.label}>{__DEV__ ? 'Metro started' : 'Built'}</Text>
              <Text style={styles.value}>{formatDateTimeLabel(appEnv.builtAt)}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  summaryText: {
    ...theme.typography.caption,
    flex: 1,
    color: theme.colors.text,
    fontWeight: '700',
  },
  details: {
    gap: theme.spacing.xs,
  },
  row: {
    gap: 2,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.muted,
  },
  value: {
    fontFamily: MONOSPACE,
    fontSize: 12,
    color: theme.colors.text,
  },
  missing: {
    color: theme.colors.danger,
  },
});
