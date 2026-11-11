import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Share, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { ListCard, RowAction, UserRow } from '../components/UserList';
import { showDialog } from '../features/dialog/dialogStore';
import { formatFriendCode, getSearchTerm, readSearchInput, SearchInput } from '../features/friends/friendSearch';
import { getErrorMessage as getRequestErrorMessage } from '../services/apiError';
import { friendService } from '../services/friendService';
import { t, TranslationKey } from '../i18n';
import { theme } from '../theme/theme';
import { BlockedUser, Friend, FriendRequestList, UserSearchMatchType, UserSearchResponse, UserSearchResult } from '../types/models';
import { formatDateLabel } from '../utils/date';

// How long typing has to pause before a search is sent. Search is limited to 30
// requests a minute, so it must not run on every keystroke.
const SEARCH_DELAY_MS = 400;

export function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequestList>({ incoming: [], outgoing: [] });
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const [friendCode, setFriendCode] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // The term of the latest search sent, and a counter so an answer that arrives
  // after a newer search was sent is dropped.
  const requestedTerm = useRef('');
  const searchSeq = useRef(0);

  const searchInput = readSearchInput(query);
  const isOwnCode = searchInput.kind === 'friendCode' && searchInput.code === friendCode;
  const searchTerm = isOwnCode ? null : getSearchTerm(searchInput);

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

  // The rest of the screen works without it, so a failure only hides the card.
  const loadFriendCode = useCallback(async () => {
    try {
      setFriendCode(await friendService.getFriendCode());
    } catch {
      setFriendCode(null);
    }
  }, []);

  useEffect(() => {
    loadFriendCode();
  }, [loadFriendCode]);

  // Requests arrive while the screen is open, so it can be pulled to refresh.
  const refresh = async () => {
    setIsRefreshing(true);
    if (!friendCode) {
      loadFriendCode();
    }
    try {
      await load();
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const runSearch = useCallback(async (term: string) => {
    const seq = ++searchSeq.current;
    requestedTerm.current = term;
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await friendService.search(term);
      if (seq === searchSeq.current) {
        setResults(response);
      }
    } catch (error) {
      if (seq === searchSeq.current) {
        // Forgotten, so submitting the same text again retries it.
        requestedTerm.current = '';
        setResults(null);
        setSearchError(getRequestErrorMessage(error, t('friends.searchFailed')));
      }
    } finally {
      if (seq === searchSeq.current) {
        setIsSearching(false);
      }
    }
  }, []);

  // Searches once typing pauses. Text the server can't match yet, such as half
  // an email address, clears the results instead, so an action no longer re-runs
  // an old search.
  useEffect(() => {
    if (!searchTerm) {
      searchSeq.current += 1;
      requestedTerm.current = '';
      setResults(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }
    if (searchTerm === requestedTerm.current) {
      return;
    }

    const timer = setTimeout(() => {
      if (searchTerm !== requestedTerm.current) {
        runSearch(searchTerm);
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [searchTerm, runSearch]);

  // The keyboard's search key doesn't wait for the pause.
  const submitSearch = () => {
    if (searchTerm && searchTerm !== requestedTerm.current) {
      runSearch(searchTerm);
    }
  };

  const shareFriendCode = () => {
    if (!friendCode) {
      return;
    }
    Share.share({
      message: t('friends.shareMessage', { code: formatFriendCode(friendCode) }),
    }).catch(() => undefined);
  };

  // Refreshes search results too, because an action changes each result's relationship.
  const run = async (userId: string, action: () => Promise<unknown>) => {
    setBusyUserId(userId);
    try {
      await action();
      await load();
      if (requestedTerm.current) {
        await runSearch(requestedTerm.current);
      }
    } catch (error) {
      showDialog({ title: t('common.errors.title'), message: getErrorMessage(error), tone: 'danger' });
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmRemove = (friend: Friend) => {
    showDialog({
      title: t('friends.remove.title'),
      message: t('friends.remove.message', { name: friend.displayName }),
      icon: 'person-remove-outline',
      buttons: [
        { text: t('common.actions.cancel'), style: 'cancel' },
        {
          text: t('common.actions.remove'),
          style: 'destructive',
          onPress: () => run(friend.userId, () => friendService.removeFriend(friend.userId)),
        },
      ],
    });
  };

  const confirmBlock = (userId: string, displayName: string) => {
    showDialog({
      title: t('friends.block.title'),
      message: t('friends.block.message', { name: displayName }),
      icon: 'ban-outline',
      buttons: [
        { text: t('common.actions.cancel'), style: 'cancel' },
        {
          text: t('common.actions.block'),
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
        return [{ label: t('common.actions.add'), tone: 'primary', onPress: () => run(userId, () => friendService.sendRequest(userId)) }];
      case 'OUTGOING_REQUEST':
        return requestId ? [{ label: t('common.actions.cancel'), onPress: () => run(userId, () => friendService.cancelRequest(requestId)) }] : [];
      case 'INCOMING_REQUEST':
        return requestId
          ? [{ label: t('common.actions.accept'), tone: 'primary', onPress: () => run(userId, () => friendService.acceptRequest(requestId)) }]
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
        {friendCode ? (
          <View style={styles.codeRow}>
            <View style={styles.codeIdentity}>
              <Text style={styles.codeLabel}>{t('friends.code.label')}</Text>
              <Text
                accessibilityLabel={t('friends.code.a11y', { digits: friendCode.split('').join(' ') })}
                selectable
                style={styles.code}
              >
                {formatFriendCode(friendCode)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t('friends.code.shareA11y')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={shareFriendCode}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
            >
              <Ionicons color={theme.colors.primary} name="share-outline" size={18} />
              <Text style={styles.shareText}>{t('common.actions.share')}</Text>
            </Pressable>
          </View>
        ) : null}
        <AppTextInput
          autoCapitalize="none"
          autoCorrect={false}
          clearable
          label={t('friends.search.label')}
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          placeholder={t('friends.search.placeholder')}
          returnKeyType="search"
          value={query}
        />
        <SearchStatus
          error={searchError}
          hint={getSearchHint(searchInput, query, isOwnCode)}
          searching={isSearching}
        />
        {results ? (
          <View style={styles.results}>
            <View style={styles.rows}>
              {results.users.map((result) => (
                <UserRow
                  key={result.userId}
                  actions={getResultActions(result)}
                  busy={busyUserId === result.userId}
                  detail={translateKey(RELATIONSHIP_LABELS[result.relationship] ?? MATCH_LABELS[results.matchType])}
                  name={result.displayName}
                  userId={result.userId}
                />
              ))}
              {results.users.length === 0 ? <Text style={styles.noResults}>{t(NO_RESULTS[results.matchType])}</Text> : null}
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
          <Text style={styles.stateText}>{t('friends.loadFailed')}</Text>
          <AppButton title={t('common.actions.tryAgain')} onPress={loadScreen} variant="secondary" />
        </View>
      ) : null}

      {!isLoading && !failed ? (
        <>
          {requestCount > 0 ? (
            <ListCard
              meta={requests.incoming.length > 0 ? t('friends.requests.new', { count: requests.incoming.length }) : undefined}
              title={t('friends.requests.title')}
            >
              {requests.incoming.map((request) => (
                <UserRow
                  key={request.id}
                  actions={[
                    {
                      label: t('common.actions.accept'),
                      tone: 'primary',
                      onPress: () => run(request.userId, () => friendService.acceptRequest(request.id)),
                    },
                    { label: t('common.actions.decline'), onPress: () => run(request.userId, () => friendService.rejectRequest(request.id)) },
                    {
                      label: t('common.actions.block'),
                      tone: 'danger',
                      icon: 'ban-outline',
                      onPress: () => confirmBlock(request.userId, request.displayName),
                    },
                  ]}
                  busy={busyUserId === request.userId}
                  detail={t('friends.requests.incoming', { date: formatDateLabel(request.createdAt) })}
                  name={request.displayName}
                  stacked
                  userId={request.userId}
                />
              ))}
              {requests.outgoing.map((request) => (
                <UserRow
                  key={request.id}
                  actions={[{ label: t('common.actions.cancel'), onPress: () => run(request.userId, () => friendService.cancelRequest(request.id)) }]}
                  busy={busyUserId === request.userId}
                  detail={t('friends.requests.outgoing', { date: formatDateLabel(request.createdAt) })}
                  name={request.displayName}
                  userId={request.userId}
                />
              ))}
            </ListCard>
          ) : null}

          <ListCard meta={friends.length > 0 ? t('friends.count.friends', { count: friends.length }) : undefined} title={t('friends.list.title')}>
            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.stateIcon}>
                  <Ionicons color={theme.colors.primary} name="people-outline" size={28} />
                </View>
                <Text style={styles.stateTitle}>{t('friends.list.emptyTitle')}</Text>
                <Text style={styles.stateDetail}>
                  {t('friends.list.emptyText')}
                </Text>
              </View>
            ) : null}
            {friends.map((friend) => (
              <UserRow
                key={friend.userId}
                actions={[
                  { label: t('common.actions.remove'), icon: 'person-remove-outline', onPress: () => confirmRemove(friend) },
                  {
                    label: t('common.actions.block'),
                    tone: 'danger',
                    icon: 'ban-outline',
                    onPress: () => confirmBlock(friend.userId, friend.displayName),
                  },
                ]}
                busy={busyUserId === friend.userId}
                detail={t('friends.list.since', { date: formatDateLabel(friend.friendsSince) })}
                name={friend.displayName}
                userId={friend.userId}
              />
            ))}
          </ListCard>

          {blocked.length > 0 ? (
            <ListCard meta={t('friends.count.people', { count: blocked.length })} title={t('friends.blocked.title')}>
              {blocked.map((user) => (
                <UserRow
                  key={user.userId}
                  actions={[{ label: t('common.actions.unblock'), onPress: () => run(user.userId, () => friendService.unblockUser(user.userId)) }]}
                  busy={busyUserId === user.userId}
                  detail={t('friends.blocked.since', { date: formatDateLabel(user.blockedAt) })}
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

const RELATIONSHIP_LABELS: Record<UserSearchResult['relationship'], TranslationKey | undefined> = {
  NONE: undefined,
  FRIEND: 'friends.relationship.friend',
  OUTGOING_REQUEST: 'friends.relationship.outgoing',
  INCOMING_REQUEST: 'friends.relationship.incoming',
};

function translateKey(key: TranslationKey | undefined) {
  return key ? t(key) : undefined;
}

// Says how a search can find someone, or what the text in the field still needs.
function getSearchHint(input: SearchInput, query: string, isOwnCode: boolean): string | null {
  if (query.trim().length === 0) {
    return t('friends.search.hintEmpty');
  }
  if (isOwnCode) {
    return t('friends.search.hintOwnCode');
  }
  if (input.kind === 'email' && !input.complete) {
    return t('friends.search.hintEmail');
  }
  if (input.kind === 'partialCode') {
    return t('friends.search.hintCode');
  }
  return null;
}

function SearchStatus({ searching, error, hint }: { searching: boolean; error: string | null; hint: string | null }) {
  if (searching) {
    return (
      <View style={styles.status}>
        <ActivityIndicator color={theme.colors.primary} size="small" />
        <Text style={styles.statusText}>{t('friends.search.searching')}</Text>
      </View>
    );
  }
  if (error) {
    return <Text style={[styles.statusText, styles.statusError]}>{error}</Text>;
  }
  return hint ? <Text style={styles.statusText}>{hint}</Text> : null;
}

// Shown under someone with no relationship yet, so it's clear why they came up.
const MATCH_LABELS: Record<UserSearchMatchType, TranslationKey | undefined> = {
  NAME: undefined,
  EMAIL: 'friends.search.matchedEmail',
  FRIEND_CODE: 'friends.search.matchedCode',
};

const NO_RESULTS: Record<UserSearchMatchType, TranslationKey> = {
  NAME: 'friends.search.noName',
  EMAIL: 'friends.search.noEmail',
  FRIEND_CODE: 'friends.search.noCode',
};

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
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  codeIdentity: {
    flex: 1,
    gap: 2,
  },
  codeLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  code: {
    color: theme.colors.text,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.primarySoft,
  },
  shareText: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: 18,
  },
  statusError: {
    color: theme.colors.danger,
  },
});
