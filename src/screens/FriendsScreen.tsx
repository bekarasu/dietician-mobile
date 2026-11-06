import { Ionicons } from '@expo/vector-icons';
import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { getAvatarColors, UserAvatar } from '../components/UserAvatar';
import { showDialog } from '../features/dialog/dialogStore';
import { friendService } from '../services/friendService';
import { theme } from '../theme/theme';
import { BlockedUser, Friend, FriendRequestList, UserSearchResult } from '../types/models';
import { formatDateLabel } from '../utils/date';

const MIN_SEARCH_LENGTH = 2;
const DANGER_SOFT = '#FDECEC';

type ActionTone = 'primary' | 'neutral' | 'danger';

interface RowAction {
  label: string;
  onPress: () => void;
  tone?: ActionTone;
  // Shown instead of the label, which screen readers still announce.
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequestList>({ incoming: [], outgoing: [] });
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const searchedQuery = useRef('');

  const load = useCallback(async () => {
    const [nextFriends, nextRequests, nextBlocked] = await Promise.all([
      friendService.listFriends(),
      friendService.listRequests(),
      friendService.listBlocked(),
    ]);

    setFriends(nextFriends);
    setRequests(nextRequests);
    setBlocked(nextBlocked);
  }, []);

  const loadScreen = useCallback(async () => {
    setIsLoading(true);
    setFailed(false);
    try {
      await load();
    } catch {
      setFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, [load]);

  useEffect(() => {
    loadScreen();
  }, [loadScreen]);

  // Requests arrive while the screen is open, so it can be pulled to refresh.
  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await load();
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Clearing the field drops the results, so an action no longer re-runs the old search.
  const changeQuery = (text: string) => {
    setQuery(text);
    if (text.trim().length === 0) {
      setResults(null);
      searchedQuery.current = '';
    }
  };

  const search = async () => {
    const term = query.trim();
    if (term.length < MIN_SEARCH_LENGTH) {
      return;
    }

    setIsSearching(true);
    try {
      setResults(await friendService.search(term));
      searchedQuery.current = term;
    } catch (error) {
      showDialog({ title: 'Error', message: getErrorMessage(error), tone: 'danger' });
    } finally {
      setIsSearching(false);
    }
  };

  // Refreshes search results too, because an action changes each result's relationship.
  const run = async (userId: string, action: () => Promise<unknown>) => {
    setBusyUserId(userId);
    try {
      await action();
      await load();
      if (searchedQuery.current) {
        setResults(await friendService.search(searchedQuery.current));
      }
    } catch (error) {
      showDialog({ title: 'Error', message: getErrorMessage(error), tone: 'danger' });
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmRemove = (friend: Friend) => {
    showDialog({
      title: 'Remove friend',
      message: `Remove ${friend.displayName} from your friends?`,
      icon: 'person-remove-outline',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => run(friend.userId, () => friendService.removeFriend(friend.userId)),
        },
      ],
    });
  };

  const confirmBlock = (userId: string, displayName: string) => {
    showDialog({
      title: 'Block user',
      message: `${displayName} won't be able to find you, and you won't see each other on leaderboards. Any friendship or request between you ends.`,
      icon: 'ban-outline',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => run(userId, () => friendService.blockUser(userId)),
        },
      ],
    });
  };

  const getResultActions = (result: UserSearchResult): RowAction[] => {
    const { requestId, userId } = result;

    switch (result.relationship) {
      case 'NONE':
        return [{ label: 'Add', tone: 'primary', onPress: () => run(userId, () => friendService.sendRequest(userId)) }];
      case 'OUTGOING_REQUEST':
        return requestId ? [{ label: 'Cancel', onPress: () => run(userId, () => friendService.cancelRequest(requestId)) }] : [];
      case 'INCOMING_REQUEST':
        return requestId
          ? [{ label: 'Accept', tone: 'primary', onPress: () => run(userId, () => friendService.acceptRequest(requestId)) }]
          : [];
      default:
        return [];
    }
  };

  const requestCount = requests.incoming.length + requests.outgoing.length;

  return (
    <ScreenContainer
      scrollViewProps={{
        bounces: true,
        keyboardShouldPersistTaps: 'handled',
        refreshControl: <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={theme.colors.primary} />,
      }}
    >
      <View style={styles.card}>
        <AppTextInput
          autoCapitalize="none"
          autoCorrect={false}
          label="Find people"
          onChangeText={changeQuery}
          onSubmitEditing={search}
          placeholder="Name or exact email"
          returnKeyType="search"
          value={query}
        />
        <AppButton
          disabled={query.trim().length < MIN_SEARCH_LENGTH}
          loading={isSearching}
          onPress={search}
          title="Search"
          variant="secondary"
        />
        {results ? (
          <View style={styles.results}>
            <View style={styles.rows}>
              {results.map((result) => (
                <UserRow
                  key={result.userId}
                  actions={getResultActions(result)}
                  busy={busyUserId === result.userId}
                  detail={RELATIONSHIP_LABELS[result.relationship]}
                  name={result.displayName}
                  userId={result.userId}
                />
              ))}
              {results.length === 0 ? <Text style={styles.noResults}>No one found.</Text> : null}
            </View>
          </View>
        ) : null}
      </View>

      {isLoading ? <ActivityIndicator color={theme.colors.primary} style={styles.loading} /> : null}

      {failed ? (
        <View style={[styles.card, styles.centeredCard]}>
          <View style={styles.stateIcon}>
            <Ionicons color={theme.colors.primary} name="cloud-offline-outline" size={28} />
          </View>
          <Text style={styles.stateText}>We couldn't load your friends. Please try again.</Text>
          <AppButton title="Try again" onPress={loadScreen} variant="secondary" />
        </View>
      ) : null}

      {!isLoading && !failed ? (
        <>
          {requestCount > 0 ? (
            <ListCard
              meta={requests.incoming.length > 0 ? `${requests.incoming.length} new` : undefined}
              title="Requests"
            >
              {requests.incoming.map((request) => (
                <UserRow
                  key={request.id}
                  actions={[
                    {
                      label: 'Accept',
                      tone: 'primary',
                      onPress: () => run(request.userId, () => friendService.acceptRequest(request.id)),
                    },
                    { label: 'Decline', onPress: () => run(request.userId, () => friendService.rejectRequest(request.id)) },
                    {
                      label: 'Block',
                      tone: 'danger',
                      icon: 'ban-outline',
                      onPress: () => confirmBlock(request.userId, request.displayName),
                    },
                  ]}
                  busy={busyUserId === request.userId}
                  detail={`Wants to be friends · ${formatDateLabel(request.createdAt)}`}
                  name={request.displayName}
                  stacked
                  userId={request.userId}
                />
              ))}
              {requests.outgoing.map((request) => (
                <UserRow
                  key={request.id}
                  actions={[{ label: 'Cancel', onPress: () => run(request.userId, () => friendService.cancelRequest(request.id)) }]}
                  busy={busyUserId === request.userId}
                  detail={`Request sent · ${formatDateLabel(request.createdAt)}`}
                  name={request.displayName}
                  userId={request.userId}
                />
              ))}
            </ListCard>
          ) : null}

          <ListCard meta={friends.length > 0 ? formatCount(friends.length, 'friend', 'friends') : undefined} title="Your friends">
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.stateIcon}>
                  <Ionicons color={theme.colors.primary} name="people-outline" size={28} />
                </View>
                <Text style={styles.stateTitle}>No friends yet</Text>
                <Text style={styles.stateDetail}>Search by name or email above to send your first request.</Text>
              </View>
            ) : null}
            {friends.map((friend) => (
              <UserRow
                key={friend.userId}
                actions={[
                  { label: 'Remove', icon: 'person-remove-outline', onPress: () => confirmRemove(friend) },
                  {
                    label: 'Block',
                    tone: 'danger',
                    icon: 'ban-outline',
                    onPress: () => confirmBlock(friend.userId, friend.displayName),
                  },
                ]}
                busy={busyUserId === friend.userId}
                detail={`Friends since ${formatDateLabel(friend.friendsSince)}`}
                name={friend.displayName}
                userId={friend.userId}
              />
            ))}
          </ListCard>

          {blocked.length > 0 ? (
            <ListCard meta={formatCount(blocked.length, 'person', 'people')} title="Blocked">
              {blocked.map((user) => (
                <UserRow
                  key={user.userId}
                  actions={[{ label: 'Unblock', onPress: () => run(user.userId, () => friendService.unblockUser(user.userId)) }]}
                  busy={busyUserId === user.userId}
                  detail={`Blocked ${formatDateLabel(user.blockedAt)}`}
                  muted
                  name={user.displayName}
                  userId={user.userId}
                />
              ))}
            </ListCard>
          ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const RELATIONSHIP_LABELS: Record<UserSearchResult['relationship'], string | undefined> = {
  NONE: undefined,
  FRIEND: 'Already friends',
  OUTGOING_REQUEST: 'Request sent',
  INCOMING_REQUEST: 'Wants to be friends',
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

interface ListCardProps extends PropsWithChildren {
  title: string;
  meta?: string;
}

function ListCard({ title, meta, children }: ListCardProps) {
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

function UserRow({ userId, name, detail, actions, busy, muted = false, stacked = false }: UserRowProps) {
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
  emptyState: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  stateTitle: {
    marginTop: theme.spacing.xs,
    color: theme.colors.text,
    fontWeight: '700',
  },
  stateDetail: {
    color: theme.colors.muted,
    lineHeight: 20,
    textAlign: 'center',
  },
  results: {
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  noResults: {
    color: theme.colors.muted,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  rows: {
    gap: 4,
    marginHorizontal: -theme.spacing.xs,
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
