import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { getAvatarColors, UserAvatar } from '../components/UserAvatar';
import { showDialog } from '../features/dialog/dialogStore';
import { AppStackParamList, ProfileStanding } from '../navigation/navigationTypes';
import { friendService } from '../services/friendService';
import { t, TranslationKey } from '../i18n';
import { theme } from '../theme/theme';
import { LeaderboardScope, PublicProfile } from '../types/models';
import { formatDateLabel } from '../utils/date';

type Props = NativeStackScreenProps<AppStackParamList, 'UserProfile'>;

const SCOPE_LABELS: Record<LeaderboardScope, TranslationKey> = {
  friends: 'friends.profile.friendsLeaderboard',
  global: 'friends.profile.globalLeaderboard',
};

export function UserProfileScreen({ route }: Props) {
  const { userId, standing } = route.params;
  // Undefined while loading, null when the user can't be shown.
  const [profile, setProfile] = useState<PublicProfile | null>();
  const [failed, setFailed] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProfile(await friendService.getProfile(userId));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setFailed(false);
    setProfile(undefined);
    load();
  };

  // Reloads after a failure too: a 409 usually means the relationship changed
  // meanwhile, such as their request arriving first.
  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusyAction(label);
    try {
      await action();
    } catch (error) {
      showDialog({ title: t('common.errors.title'), message: getErrorMessage(error), tone: 'danger' });
    }
    await load();
    setBusyAction(null);
  };

  // The leaderboard's copy of the name shows until the profile loads.
  const displayName = profile?.displayName ?? route.params.displayName;

  const renderActions = () => {
    if (failed) {
      return (
        <View style={[styles.card, styles.centeredCard]}>
          <View style={styles.stateIcon}>
            <Ionicons color={theme.colors.primary} name="cloud-offline-outline" size={28} />
          </View>
          <Text style={styles.stateText}>{t('friends.profile.loadFailed')}</Text>
          <AppButton title={t('common.actions.tryAgain')} onPress={retry} variant="secondary" />
        </View>
      );
    }

    if (profile === undefined) {
      return <ActivityIndicator color={theme.colors.primary} style={styles.loading} />;
    }

    if (profile === null) {
      return (
        <View style={[styles.card, styles.centeredCard]}>
          <View style={styles.stateIcon}>
            <Ionicons color={theme.colors.primary} name="eye-off-outline" size={28} />
          </View>
          <Text style={styles.stateText}>{t('friends.profile.unavailable')}</Text>
        </View>
      );
    }

    const { relationship, requestId } = profile;
    const button = (label: string, action: () => Promise<unknown>, variant: 'primary' | 'secondary' = 'primary') => (
      <AppButton
        disabled={busyAction !== null}
        loading={busyAction === label}
        onPress={() => run(label, action)}
        title={label}
        variant={variant}
      />
    );

    if (relationship === 'NONE') {
      return (
        <View style={styles.actions}>
          {button(t('friends.profile.addFriend'), () => friendService.sendRequest(userId))}
          <Text style={styles.hint}>{t('friends.profile.addHint')}</Text>
        </View>
      );
    }

    if (relationship === 'OUTGOING_REQUEST' && requestId) {
      return (
        <View style={styles.actions}>
          {button(t('friends.profile.cancelRequest'), () => friendService.cancelRequest(requestId), 'secondary')}
          <Text style={styles.hint}>{t('friends.profile.cancelHint')}</Text>
        </View>
      );
    }

    if (relationship === 'INCOMING_REQUEST' && requestId) {
      return (
        <View style={styles.actions}>
          {button(t('friends.profile.acceptRequest'), () => friendService.acceptRequest(requestId))}
          {button(t('common.actions.decline'), () => friendService.rejectRequest(requestId), 'secondary')}
        </View>
      );
    }

    return null;
  };

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <View style={styles.identity}>
          <UserAvatar colors={getAvatarColors(userId)} name={displayName} size={88} />
          <Text style={styles.name}>{displayName}</Text>
          {profile ? <RelationshipChip profile={profile} /> : null}
        </View>
        {standing ? <StandingRow standing={standing} /> : null}
      </View>

      {renderActions()}
    </ScreenContainer>
  );
}

function RelationshipChip({ profile }: { profile: PublicProfile }) {
  let icon: keyof typeof Ionicons.glyphMap;
  let label: string;

  switch (profile.relationship) {
    case 'FRIEND':
      icon = 'people';
      label = profile.friendsSince ? t('friends.list.since', { date: formatDateLabel(profile.friendsSince) }) : t('friends.relationship.friends');
      break;
    case 'OUTGOING_REQUEST':
      icon = 'time-outline';
      label = t('friends.relationship.outgoing');
      break;
    case 'INCOMING_REQUEST':
      icon = 'person-add-outline';
      label = t('friends.relationship.incoming');
      break;
    default:
      return null;
  }

  return (
    <View style={styles.chip}>
      <Ionicons color={theme.colors.primary} name={icon} size={14} />
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function StandingRow({ standing }: { standing: ProfileStanding }) {
  const { rank, totalScore, scope, periodLabel } = standing;

  return (
    <View style={styles.standing}>
      <View accessible accessibilityLabel={t('friends.profile.standingA11y', { rank, points: totalScore })} style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>#{rank}</Text>
          <Text style={styles.statLabel}>{t('friends.profile.rank')}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalScore}</Text>
          <Text style={styles.statLabel}>{t('friends.profile.points')}</Text>
        </View>
      </View>
      <Text style={styles.standingCaption}>
        {t(SCOPE_LABELS[scope])} · {periodLabel}
      </Text>
    </View>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : t('common.errors.generic');
}

const styles = StyleSheet.create({
  loading: {
    marginTop: theme.spacing.xl,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  centeredCard: {
    alignItems: 'center',
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  stateText: {
    color: theme.colors.text,
    lineHeight: 22,
    textAlign: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  name: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '800',
    lineHeight: theme.typography.title.lineHeight,
    textAlign: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primarySoft,
  },
  chipText: {
    color: theme.colors.primary,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  standing: {
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  stats: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.secondarySurface,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  standingCaption: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    textAlign: 'center',
  },
  actions: {
    gap: theme.spacing.sm,
  },
  hint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 18,
    textAlign: 'center',
  },
});
