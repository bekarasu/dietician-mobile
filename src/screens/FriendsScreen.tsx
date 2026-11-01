import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { UserAvatar } from '../components/UserAvatar';
import { friendService } from '../services/friendService';
import { theme } from '../theme/theme';
import { BlockedUser, Friend, FriendRequestList, UserSearchResult } from '../types/models';

const MIN_SEARCH_LENGTH = 2;

interface RowAction {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequestList>({ incoming: [], outgoing: [] });
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      Alert.alert('Error', getErrorMessage(error));
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
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmRemove = (friend: Friend) => {
    Alert.alert('Remove friend', `Remove ${friend.displayName} from your friends?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => run(friend.userId, () => friendService.removeFriend(friend.userId)),
      },
    ]);
  };

  const confirmBlock = (userId: string, displayName: string) => {
    Alert.alert(
      'Block user',
      `${displayName} won't be able to find you, and you won't see each other on leaderboards. Any friendship or request between you ends.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => run(userId, () => friendService.blockUser(userId)),
        },
      ],
    );
  };

  const getResultActions = (result: UserSearchResult): RowAction[] => {
    const { requestId, userId } = result;

    switch (result.relationship) {
      case 'NONE':
        return [{ label: 'Add', onPress: () => run(userId, () => friendService.sendRequest(userId)) }];
      case 'OUTGOING_REQUEST':
        return requestId ? [{ label: 'Cancel', onPress: () => run(userId, () => friendService.cancelRequest(requestId)) }] : [];
      case 'INCOMING_REQUEST':
        return requestId ? [{ label: 'Accept', onPress: () => run(userId, () => friendService.acceptRequest(requestId)) }] : [];
      default:
        return [];
    }
  };

  const hasRequests = requests.incoming.length > 0 || requests.outgoing.length > 0;

  return (
    <ScreenContainer scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
      <AppCard style={styles.searchCard}>
        <AppTextInput
          autoCapitalize="none"
          autoCorrect={false}
          label="Find people"
          onChangeText={setQuery}
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
        {results?.map((result) => (
          <UserRow
            key={result.userId}
            actions={getResultActions(result)}
            busy={busyUserId === result.userId}
            name={result.displayName}
            subtitle={RELATIONSHIP_LABELS[result.relationship]}
          />
        ))}
        {results?.length === 0 ? <Text style={styles.empty}>No one found.</Text> : null}
      </AppCard>

      {isLoading ? <ActivityIndicator color={theme.colors.primary} /> : null}

      {failed ? (
        <AppCard style={styles.errorCard}>
          <Text style={styles.body}>We couldn't load your friends. Please try again.</Text>
          <AppButton title="Try again" onPress={loadScreen} variant="secondary" />
        </AppCard>
      ) : null}

      {!isLoading && !failed ? (
        <>
          {hasRequests ? <SectionHeader title="Requests" /> : null}
          {requests.incoming.map((request) => (
            <AppCard key={request.id}>
              <UserRow
                actions={[
                  { label: 'Accept', onPress: () => run(request.userId, () => friendService.acceptRequest(request.id)) },
                  { label: 'Decline', onPress: () => run(request.userId, () => friendService.rejectRequest(request.id)) },
                  { label: 'Block', onPress: () => confirmBlock(request.userId, request.displayName), destructive: true },
                ]}
                busy={busyUserId === request.userId}
                name={request.displayName}
                subtitle="Wants to be friends"
              />
            </AppCard>
          ))}
          {requests.outgoing.map((request) => (
            <AppCard key={request.id}>
              <UserRow
                actions={[{ label: 'Cancel', onPress: () => run(request.userId, () => friendService.cancelRequest(request.id)) }]}
                busy={busyUserId === request.userId}
                name={request.displayName}
                subtitle="Request sent"
              />
            </AppCard>
          ))}

          <SectionHeader title="Friends" />
          {friends.length === 0 ? <Text style={styles.empty}>Search above to add your first friend.</Text> : null}
          {friends.map((friend) => (
            <AppCard key={friend.userId}>
              <UserRow
                actions={[
                  { label: 'Remove', onPress: () => confirmRemove(friend) },
                  { label: 'Block', onPress: () => confirmBlock(friend.userId, friend.displayName), destructive: true },
                ]}
                busy={busyUserId === friend.userId}
                name={friend.displayName}
              />
            </AppCard>
          ))}

          {blocked.length > 0 ? <SectionHeader title="Blocked" /> : null}
          {blocked.map((user) => (
            <AppCard key={user.userId}>
              <UserRow
                actions={[{ label: 'Unblock', onPress: () => run(user.userId, () => friendService.unblockUser(user.userId)) }]}
                busy={busyUserId === user.userId}
                name={user.displayName}
              />
            </AppCard>
          ))}
        </>
      ) : null}
    </ScreenContainer>
  );
}

const RELATIONSHIP_LABELS: Record<UserSearchResult['relationship'], string | undefined> = {
  NONE: undefined,
  FRIEND: 'Friend',
  OUTGOING_REQUEST: 'Request sent',
  INCOMING_REQUEST: 'Wants to be friends',
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

interface UserRowProps {
  name: string;
  subtitle?: string;
  actions: RowAction[];
  busy: boolean;
}

function UserRow({ name, subtitle, actions, busy }: UserRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.identityRow}>
        <UserAvatar name={name} />
        <View style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {busy ? (
        <ActivityIndicator color={theme.colors.primary} style={styles.busy} />
      ) : actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              hitSlop={theme.spacing.xs}
              onPress={action.onPress}
              style={styles.action}
            >
              <Text style={[styles.actionLabel, action.destructive ? styles.actionDestructive : undefined]}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    gap: theme.spacing.md,
  },
  errorCard: {
    gap: theme.spacing.lg,
  },
  body: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  empty: {
    color: theme.colors.muted,
  },
  row: {
    gap: theme.spacing.sm,
  },
  identityRow: {
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
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    marginTop: 2,
  },
  busy: {
    alignSelf: 'flex-end',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'flex-end',
  },
  action: {
    paddingVertical: theme.spacing.xs,
  },
  actionLabel: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  actionDestructive: {
    color: theme.colors.danger,
  },
});
