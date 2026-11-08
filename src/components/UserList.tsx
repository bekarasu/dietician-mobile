import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme/theme';
import { getAvatarColors, UserAvatar } from './UserAvatar';

const DANGER_SOFT = '#FDECEC';

export type ActionTone = 'primary' | 'neutral' | 'danger';

export interface RowAction {
  label: string;
  onPress: () => void;
  tone?: ActionTone;
  // Shown instead of the label, which screen readers still announce.
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ListCardProps extends PropsWithChildren {
  title: string;
  meta?: string;
}

export function ListCard({ title, meta, children }: ListCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
      </View>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

interface UserRowProps {
  userId: string;
  name: string;
  detail?: string;
  actions: RowAction[];
  busy: boolean;
  // Blocked people keep the neutral avatar.
  muted?: boolean;
  // Puts the actions on their own line, for rows with too many to fit beside the name.
  stacked?: boolean;
}

export function UserRow({ userId, name, detail, actions, busy, muted = false, stacked = false }: UserRowProps) {
  const buttons = actions.map((action) => <ActionButton key={action.label} action={action} name={name} stretch={stacked} />);

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <UserAvatar colors={muted ? undefined : getAvatarColors(userId)} name={name} />
        <View style={styles.identity}>
          <Text numberOfLines={1} style={[styles.name, muted && styles.nameMuted]}>
            {name}
          </Text>
          {detail ? (
            <Text numberOfLines={1} style={styles.detail}>
              {detail}
            </Text>
          ) : null}
        </View>
        {busy ? <ActivityIndicator color={theme.colors.primary} /> : null}
        {!busy && !stacked && buttons.length > 0 ? <View style={styles.actions}>{buttons}</View> : null}
      </View>
      {!busy && stacked && buttons.length > 0 ? <View style={styles.stackedActions}>{buttons}</View> : null}
    </View>
  );
}

interface ActionButtonProps {
  action: RowAction;
  name: string;
  // Labelled buttons share the row's width.
  stretch: boolean;
}

function ActionButton({ action, name, stretch }: ActionButtonProps) {
  const tone = action.tone ?? 'neutral';

  return (
    <Pressable
      accessibilityLabel={`${action.label} ${name}`}
      accessibilityRole="button"
      hitSlop={theme.spacing.xs}
      onPress={action.onPress}
      style={({ pressed }) => [
        action.icon ? styles.iconButton : styles.pillButton,
        toneStyles[tone],
        stretch && !action.icon ? styles.stretch : undefined,
        pressed && styles.pressed,
      ]}
    >
      {action.icon ? (
        <Ionicons color={toneTextColors[tone]} name={action.icon} size={17} />
      ) : (
        <Text style={[styles.pillLabel, { color: toneTextColors[tone] }]}>{action.label}</Text>
      )}
    </Pressable>
  );
}

const toneTextColors: Record<ActionTone, string> = {
  primary: theme.colors.surface,
  neutral: theme.colors.text,
  danger: theme.colors.danger,
};

const toneStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.primary,
  },
  neutral: {
    backgroundColor: theme.colors.secondarySurface,
  },
  danger: {
    backgroundColor: DANGER_SOFT,
  },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  rows: {
    gap: 4,
    marginHorizontal: -theme.spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
  },
  row: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  rowMain: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  identity: {
    flex: 1,
  },
  name: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  nameMuted: {
    color: theme.colors.muted,
  },
  detail: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  stackedActions: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    // Lines the buttons up with the name, past the 40pt avatar.
    paddingLeft: 40 + theme.spacing.sm,
  },
  pillButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.round,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stretch: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
