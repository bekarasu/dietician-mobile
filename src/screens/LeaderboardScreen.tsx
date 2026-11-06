import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, AppState, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { AvatarColors, getAvatarColors, UserAvatar } from '../components/UserAvatar';
import { showDialog } from '../features/dialog/dialogStore';
import { getComparisonMessage, getDifferenceLabel, getStatusMessage } from '../features/leaderboard/scoreMessages';
import { AppStackParamList } from '../navigation/navigationTypes';
import { LEADERBOARD_PAGE_SIZE, leaderboardService } from '../services/leaderboardService';
import { theme } from '../theme/theme';
import { Leaderboard, LeaderboardEntry, LeaderboardPeriod, LeaderboardScope } from '../types/models';
import { formatDateTimeLabel, formatMonth, formatWeekRange } from '../utils/date';

const SCOPE_OPTIONS: { label: string; value: LeaderboardScope }[] = [
  { label: 'Friends', value: 'friends' },
  { label: 'Global', value: 'global' },
];

const PERIOD_OPTIONS: { label: string; value: LeaderboardPeriod }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

const LOAD_ERROR = 'We couldn\'t load the rankings. Please try again.';

// How often the current period refreshes while it's on screen. Scores change
// within seconds of anyone logging, and this stays far inside the server's
// limit of 60 leaderboard requests a minute.
const LIVE_REFRESH_MS = 20_000;

// ring marks the avatar, text sits on soft.
const MEDALS: Record<number, { ring: string; soft: string; text: string }> = {
  1: { ring: '#F2B705', soft: '#FDF3D1', text: '#8A6100' },
  2: { ring: '#A7B4C4', soft: '#EEF1F5', text: '#4F5D70' },
  3: { ring: '#D58A4A', soft: '#F9E9DB', text: '#93501C' },
};

// The user's own row is tinted, which would hide a tinted avatar.
const CURRENT_USER_AVATAR: AvatarColors = { background: theme.colors.surface, text: theme.colors.primary };

// Left to right: second, first, third.
const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHTS = [84, 62, 48];

const ON_PRIMARY_MUTED = 'rgba(255, 255, 255, 0.78)';
const ON_PRIMARY_TINT = 'rgba(255, 255, 255, 0.16)';
const LIVE_COLOR = '#4ADE80';

export function LeaderboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [scope, setScope] = useState<LeaderboardScope>('friends');
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const [periodStart, setPeriodStart] = useState<string>();
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [failed, setFailed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Pages are counted rather than taken from the list length, because the server
  // can leave a row out of a page.
  const nextOffset = useRef(0);
  // Only the latest request may update the screen, so a slow response can't
  // replace the rankings for a newer selection.
  const latestRequest = useRef(0);

  // A quiet load is a background refresh: if it fails, the rankings on screen stay.
  const load = useCallback(async ({ quiet = false } = {}) => {
    const request = ++latestRequest.current;

    try {
      const next = await leaderboardService.getLeaderboard(scope, period, periodStart);
      if (request === latestRequest.current) {
        nextOffset.current = LEADERBOARD_PAGE_SIZE;
        setBoard(next);
        setFailed(false);
      }
    } catch {
      if (request === latestRequest.current && !quiet) {
        setBoard(null);
        setFailed(true);
      }
    }
  }, [scope, period, periodStart]);

  const boardRef = useRef(board);
  boardRef.current = board;

  // Loads on focus too, because this tab stays mounted while friends change from
  // Profile. While the current period is on screen and the app is open, it keeps
  // refreshing, so rankings move as people log. A past period no longer changes,
  // and a refresh would drop pages loaded with "Show more", so those are left alone.
  useFocusEffect(
    useCallback(() => {
      load();

      const refreshLive = () => {
        const shown = boardRef.current;
        const isLive = shown !== null && shown.nextPeriodStart === null;
        if (isLive && nextOffset.current <= LEADERBOARD_PAGE_SIZE && AppState.currentState === 'active') {
          load({ quiet: true });
        }
      };
      const timer = setInterval(refreshLive, LIVE_REFRESH_MS);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          refreshLive();
        }
      });

      return () => {
        clearInterval(timer);
        subscription.remove();
      };
    }, [load]),
  );

  const clearBoard = () => {
    setBoard(null);
    setFailed(false);
  };

  const changeScope = (next: LeaderboardScope) => {
    if (next !== scope) {
      clearBoard();
      setScope(next);
    }
  };

  const changePeriod = (next: LeaderboardPeriod) => {
    if (next !== period) {
      clearBoard();
      setPeriodStart(undefined);
      setPeriod(next);
    }
  };

  const changePeriodStart = (next: string) => {
    clearBoard();
    setPeriodStart(next);
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const retry = () => {
    clearBoard();
    load();
  };

  const loadMore = async () => {
    if (!board) {
      return;
    }

    const request = ++latestRequest.current;
    setIsLoadingMore(true);

    try {
      const next = await leaderboardService.getLeaderboard(scope, period, board.periodStart, nextOffset.current);
      if (request === latestRequest.current) {
        nextOffset.current += LEADERBOARD_PAGE_SIZE;
        setBoard(appendPage(board, next));
      }
    } catch {
      if (request === latestRequest.current) {
        showDialog({ title: 'Error', message: LOAD_ERROR, tone: 'danger' });
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <ScreenContainer
      scrollViewProps={{
        bounces: true,
        refreshControl: <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={theme.colors.primary} />,
      }}
    >
      <SectionHeader title="Leaderboard" subtitle="See how your habits compare with friends and everyone else." />

      <View style={styles.controls}>
        <View style={styles.control}>
          <SegmentedControl options={SCOPE_OPTIONS} value={scope} onChange={changeScope} />
        </View>
        <View style={styles.control}>
          <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={changePeriod} />
        </View>
      </View>

      {failed ? (
        <View style={[styles.card, styles.centeredCard]}>
          <View style={styles.stateIcon}>
            <Ionicons color={theme.colors.primary} name="cloud-offline-outline" size={28} />
          </View>
          <Text style={styles.stateText}>{LOAD_ERROR}</Text>
          <AppButton title="Try again" onPress={retry} variant="secondary" />
        </View>
      ) : null}

      {!failed && !board ? <ActivityIndicator color={theme.colors.primary} style={styles.loading} /> : null}

      {board ? (
        <>
          <StandingCard
            board={board}
            onChangePeriod={changePeriodStart}
            onExplain={() => navigation.navigate('ScoreBreakdown', { period, periodStart: board.periodStart })}
          />

          {board.participants.length > 0 ? (
            <Rankings
              board={board}
              onOpenProfile={(entry) =>
                navigation.navigate('UserProfile', {
                  userId: entry.userId,
                  displayName: entry.displayName,
                  standing: { rank: entry.rank, totalScore: entry.totalScore, scope, periodLabel: getPeriodLabel(board) },
                })
              }
            />
          ) : (
            <View style={[styles.card, styles.centeredCard]}>
              <View style={styles.stateIcon}>
                <Ionicons color={theme.colors.primary} name={scope === 'friends' ? 'people-outline' : 'trophy-outline'} size={28} />
              </View>
              <Text style={styles.stateText}>{getEmptyMessage(scope, board)}</Text>
            </View>
          )}

          {board.hasMore ? (
            <AppButton title="Show more" onPress={loadMore} loading={isLoadingMore} variant="secondary" />
          ) : null}

          <UpdatedCaption board={board} />

          {scope === 'friends' ? (
            <FriendsCard friendCount={board.friendCount} onPress={() => navigation.navigate('Friends')} />
          ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
}

interface PeriodNavigatorProps {
  board: Leaderboard;
  onChange: (periodStart: string) => void;
}

function PeriodNavigator({ board, onChange }: PeriodNavigatorProps) {
  const { nextPeriodStart, previousPeriodStart } = board;
  const label = getPeriodLabel(board);

  return (
    <View style={styles.periodRow}>
      <Pressable
        accessibilityLabel="Previous period"
        accessibilityRole="button"
        hitSlop={theme.spacing.sm}
        onPress={() => onChange(previousPeriodStart)}
        style={({ pressed }) => [styles.periodButton, pressed && styles.pressed]}
      >
        <Ionicons color={theme.colors.surface} name="chevron-back" size={18} />
      </Pressable>
      <Text style={styles.periodLabel}>{label}</Text>
      <Pressable
        accessibilityLabel="Next period"
        accessibilityRole="button"
        accessibilityState={{ disabled: nextPeriodStart === null }}
        disabled={nextPeriodStart === null}
        hitSlop={theme.spacing.sm}
        onPress={() => nextPeriodStart && onChange(nextPeriodStart)}
        style={({ pressed }) => [styles.periodButton, nextPeriodStart === null && styles.periodButtonDisabled, pressed && styles.pressed]}
      >
        <Ionicons color={theme.colors.surface} name="chevron-forward" size={18} />
      </Pressable>
    </View>
  );
}

interface StandingCardProps {
  board: Leaderboard;
  onChangePeriod: (periodStart: string) => void;
  onExplain: () => void;
}

function StandingCard({ board, onChangePeriod, onExplain }: StandingCardProps) {
  const { currentUser, totalParticipants } = board;
  const isLive = board.nextPeriodStart === null;
  // A finished period's message only repeats the rank shown above it.
  const comparison = isLive ? getComparisonMessage(board) : null;
  const progress = getNextRankProgress(board);

  return (
    <View style={styles.heroShadow}>
      <View style={styles.hero}>
        <View style={[styles.heroGlow, styles.heroGlowLarge]} />
        <View style={[styles.heroGlow, styles.heroGlowSmall]} />

        <PeriodNavigator board={board} onChange={onChangePeriod} />

        <View style={styles.heroLabelRow}>
          <Text style={styles.heroLabel}>YOUR POSITION</Text>
          {isLive ? (
            <LiveBadge />
          ) : (
            <View style={styles.heroBadge}>
              <Ionicons color={theme.colors.surface} name="flag" size={11} />
              <Text style={styles.heroBadgeText}>FINAL</Text>
            </View>
          )}
        </View>

        {currentUser.rank === null ? (
          <View style={styles.heroUnranked}>
            <View style={styles.heroIcon}>
              <Ionicons color={theme.colors.surface} name="hourglass-outline" size={22} />
            </View>
            <Text style={[styles.heroMessage, styles.heroUnrankedText]}>{getStatusMessage(currentUser.statusReason)}</Text>
          </View>
        ) : (
          <View
            accessible
            accessibilityLabel={`Rank ${currentUser.rank} of ${totalParticipants}, ${currentUser.totalScore ?? 0} points`}
            style={styles.heroStats}
          >
            <Text style={styles.heroRank}>
              #{currentUser.rank}
              <Text style={styles.heroRankOf}> of {totalParticipants}</Text>
            </Text>
            <View style={styles.heroScore}>
              <Text style={styles.heroScoreValue}>{currentUser.totalScore ?? '–'}</Text>
              <Text style={styles.heroScoreUnit}>POINTS</Text>
            </View>
          </View>
        )}

        {progress !== null ? (
          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${progress * 100}%` }]} />
          </View>
        ) : null}

        {comparison ? <Text style={styles.heroMessage}>{comparison}</Text> : null}

        <Pressable
          accessibilityRole="button"
          onPress={onExplain}
          style={({ pressed }) => [styles.heroLink, pressed && styles.pressed]}
        >
          <Ionicons color={theme.colors.surface} name="information-circle-outline" size={18} />
          <Text style={styles.heroLinkText}>How is my score calculated?</Text>
          <Ionicons color={ON_PRIMARY_MUTED} name="chevron-forward" size={16} />
        </Pressable>
      </View>
    </View>
  );
}

function LiveBadge() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={styles.heroBadge}>
      <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
      <Text style={styles.heroBadgeText}>LIVE</Text>
    </View>
  );
}

interface RankingsProps {
  board: Leaderboard;
  onOpenProfile: (entry: LeaderboardEntry) => void;
}

// The top three stand on a podium once there are enough people to fill it.
// Everyone but the user opens their profile when pressed.
function Rankings({ board, onOpenProfile }: RankingsProps) {
  const { participants, totalParticipants } = board;
  const hasPodium = participants.length >= 3;
  const rows = hasPodium ? participants.slice(3) : participants;
  const getOnPress = (entry: LeaderboardEntry) => (entry.isCurrentUser ? undefined : () => onOpenProfile(entry));

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Rankings</Text>
        <Text style={styles.cardMeta}>
          {totalParticipants} {totalParticipants === 1 ? 'person' : 'people'}
        </Text>
      </View>

      {hasPodium ? (
        <View style={[styles.podium, rows.length > 0 ? styles.podiumWithRows : undefined]}>
          {PODIUM_ORDER.map((position) => (
            <PodiumPlace
              key={participants[position].userId}
              entry={participants[position]}
              onPress={getOnPress(participants[position])}
              position={position}
            />
          ))}
        </View>
      ) : null}

      {rows.length > 0 ? (
        <View style={styles.rows}>
          {rows.map((entry) => (
            <RankingRow key={entry.userId} entry={entry} onPress={getOnPress(entry)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

interface EntryProps {
  entry: LeaderboardEntry;
  onPress?: () => void;
}

function PodiumPlace({ entry, onPress, position }: EntryProps & { position: number }) {
  // A podium position's rank is at most position + 1, so it always has a medal.
  const medal = MEDALS[entry.rank] ?? MEDALS[3];
  const isTop = position === 0;

  return (
    <Pressable
      {...getEntryPressProps(entry, onPress)}
      style={({ pressed }) => [styles.podiumPlace, pressed && styles.pressed]}
    >
      {isTop ? <MaterialCommunityIcons color={MEDALS[1].ring} name="crown" size={26} /> : null}
      <View style={[styles.podiumRing, { borderColor: medal.ring }]}>
        <UserAvatar colors={getAvatarColors(entry.userId)} name={entry.displayName} size={isTop ? 60 : 50} />
      </View>
      <Text numberOfLines={1} style={[styles.podiumName, entry.isCurrentUser && styles.currentUserName]}>
        {entry.isCurrentUser ? 'You' : entry.displayName}
      </Text>
      <Text style={styles.podiumScore}>{entry.totalScore} pts</Text>
      <View style={[styles.podiumBlock, { backgroundColor: medal.soft, height: PODIUM_HEIGHTS[position] }]}>
        <Text style={[styles.podiumRank, { color: medal.text }]}>{entry.rank}</Text>
      </View>
    </Pressable>
  );
}

function RankingRow({ entry, onPress }: EntryProps) {
  const differenceLabel = getDifferenceLabel(entry);
  const medal = MEDALS[entry.rank];

  return (
    <Pressable
      {...getEntryPressProps(entry, onPress)}
      style={({ pressed }) => [
        styles.row,
        entry.isCurrentUser ? styles.rowCurrentUser : undefined,
        pressed && styles.rowPressed,
      ]}
    >
      {medal ? (
        <View style={[styles.rankMedal, { backgroundColor: medal.soft }]}>
          <Text style={[styles.rankMedalText, { color: medal.text }]}>{entry.rank}</Text>
        </View>
      ) : (
        <Text style={styles.rank}>{entry.rank}</Text>
      )}
      <UserAvatar
        colors={entry.isCurrentUser ? CURRENT_USER_AVATAR : getAvatarColors(entry.userId)}
        name={entry.displayName}
      />
      <View style={styles.identity}>
        <Text numberOfLines={1} style={[styles.name, entry.isCurrentUser && styles.currentUserName]}>
          {entry.isCurrentUser ? 'You' : entry.displayName}
        </Text>
        {differenceLabel ? <Text style={styles.difference}>{differenceLabel}</Text> : null}
      </View>
      <View style={[styles.scorePill, entry.isCurrentUser ? styles.scorePillCurrentUser : undefined]}>
        <Text style={[styles.score, entry.isCurrentUser && styles.scoreCurrentUser]}>{entry.totalScore}</Text>
        <Text style={[styles.scoreUnit, entry.isCurrentUser && styles.scoreCurrentUser]}>pts</Text>
      </View>
    </Pressable>
  );
}

function UpdatedCaption({ board }: { board: Leaderboard }) {
  let caption: string | null = null;
  if (board.nextPeriodStart === null) {
    caption = `Scores update as people log.${board.lastUpdatedAt ? ` Last change ${formatDateTimeLabel(board.lastUpdatedAt)}.` : ''}`;
  } else if (board.lastUpdatedAt) {
    caption = `Updated ${formatDateTimeLabel(board.lastUpdatedAt)}`;
  }

  if (!caption) {
    return null;
  }

  return (
    <View style={styles.captionRow}>
      <Ionicons color={theme.colors.muted} name="time-outline" size={13} />
      <Text style={styles.caption}>{caption}</Text>
    </View>
  );
}

function FriendsCard({ friendCount, onPress }: { friendCount?: number; onPress: () => void }) {
  const hasNoFriends = friendCount === 0;
  let detail = 'Add or remove the people you compete with.';
  if (hasNoFriends) {
    detail = 'Search by name or email to send a request.';
  } else if (friendCount) {
    detail = `${friendCount} ${friendCount === 1 ? 'friend' : 'friends'} on your leaderboard.`;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.friendsCard, pressed && styles.pressed]}
    >
      <View style={styles.friendsIcon}>
        <Ionicons color={theme.colors.primary} name={hasNoFriends ? 'person-add' : 'people'} size={20} />
      </View>
      <View style={styles.identity}>
        <Text style={styles.name}>{hasNoFriends ? 'Find friends' : 'Manage friends'}</Text>
        <Text style={styles.difference}>{detail}</Text>
      </View>
      <Ionicons color={theme.colors.muted} name="chevron-forward" size={18} />
    </Pressable>
  );
}

// How far the user's score has come toward the score of the next rank up.
function getNextRankProgress({ currentUser, nextPeriodStart }: Leaderboard) {
  const { totalScore, pointsToNextRank } = currentUser;
  if (nextPeriodStart !== null || totalScore === null || pointsToNextRank === null) {
    return null;
  }
  const target = totalScore + pointsToNextRank;
  return target > 0 ? Math.min(Math.max(totalScore / target, 0), 1) : null;
}

function getEntryLabel(entry: LeaderboardEntry) {
  return `Rank ${entry.rank}, ${entry.isCurrentUser ? 'you' : entry.displayName}, ${entry.totalScore} points`;
}

// An entry without onPress, the user's own, reads as plain text rather than a disabled button.
function getEntryPressProps(entry: LeaderboardEntry, onPress?: () => void) {
  return {
    accessible: true,
    accessibilityLabel: getEntryLabel(entry),
    accessibilityRole: onPress ? ('button' as const) : undefined,
    accessibilityHint: onPress ? 'Opens their profile' : undefined,
    disabled: !onPress,
    onPress,
  };
}

function getPeriodLabel({ periodType, periodStart, periodEndExclusive }: Leaderboard) {
  return periodType === 'weekly' ? formatWeekRange(periodStart, periodEndExclusive) : formatMonth(periodStart);
}

// A score can change between pages and move someone onto the next one.
function appendPage(board: Leaderboard, page: Leaderboard): Leaderboard {
  const seen = new Set(board.participants.map((entry) => entry.userId));

  return {
    ...page,
    participants: [...board.participants, ...page.participants.filter((entry) => !seen.has(entry.userId))],
  };
}

function getEmptyMessage(scope: LeaderboardScope, board: Leaderboard) {
  if (scope === 'global') {
    return 'No one has a score for this period yet.';
  }
  if (board.friendCount === 0) {
    return 'Add friends to compare your progress.';
  }
  return 'No one in your friends list has a score for this period yet.';
}

const styles = StyleSheet.create({
  controls: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  control: {
    flex: 1,
  },
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
  pressed: {
    opacity: 0.8,
  },
  // iOS clips a shadow on a view that hides overflow, so the shadow sits on a wrapper.
  heroShadow: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.xl,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  hero: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.xl,
    gap: theme.spacing.md,
    overflow: 'hidden',
    padding: theme.spacing.lg,
  },
  heroGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  heroGlowLarge: {
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -110,
    right: -80,
  },
  heroGlowSmall: {
    width: 160,
    height: 160,
    borderRadius: 80,
    bottom: -80,
    left: -50,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    borderRadius: theme.radii.round,
    padding: 4,
  },
  periodButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ON_PRIMARY_TINT,
  },
  periodButtonDisabled: {
    opacity: 0.35,
  },
  periodLabel: {
    color: theme.colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    color: ON_PRIMARY_MUTED,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: theme.radii.round,
    backgroundColor: ON_PRIMARY_TINT,
  },
  heroBadgeText: {
    color: theme.colors.surface,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: LIVE_COLOR,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  heroRank: {
    flexShrink: 1,
    color: theme.colors.surface,
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 58,
  },
  heroRankOf: {
    color: ON_PRIMARY_MUTED,
    fontSize: 17,
    fontWeight: '600',
  },
  heroScore: {
    alignItems: 'center',
    minWidth: 92,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    backgroundColor: ON_PRIMARY_TINT,
  },
  heroScoreValue: {
    color: theme.colors.surface,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  heroScoreUnit: {
    color: ON_PRIMARY_MUTED,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroUnranked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ON_PRIMARY_TINT,
  },
  heroUnrankedText: {
    flex: 1,
  },
  heroTrack: {
    height: 8,
    borderRadius: theme.radii.round,
    backgroundColor: ON_PRIMARY_TINT,
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.surface,
  },
  heroMessage: {
    color: theme.colors.surface,
    lineHeight: 21,
  },
  heroLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingTop: theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroLinkText: {
    flex: 1,
    color: theme.colors.surface,
    fontWeight: '700',
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
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  podiumWithRows: {
    paddingBottom: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  podiumPlace: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  podiumRing: {
    padding: 3,
    borderRadius: theme.radii.round,
    borderWidth: 3,
  },
  podiumName: {
    maxWidth: '100%',
    marginTop: 2,
    color: theme.colors.text,
    fontWeight: '700',
  },
  podiumScore: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  podiumBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
    borderTopLeftRadius: theme.radii.lg,
    borderTopRightRadius: theme.radii.lg,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  podiumRank: {
    fontSize: 24,
    fontWeight: '800',
  },
  rows: {
    gap: 4,
    marginHorizontal: -theme.spacing.xs,
  },
  row: {
    alignItems: 'center',
    borderRadius: theme.radii.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
  },
  rowCurrentUser: {
    backgroundColor: theme.colors.primarySoft,
  },
  rowPressed: {
    backgroundColor: theme.colors.secondarySurface,
  },
  rank: {
    color: theme.colors.muted,
    fontWeight: '700',
    width: 28,
    textAlign: 'center',
  },
  rankMedal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankMedalText: {
    fontSize: 13,
    fontWeight: '800',
  },
  identity: {
    flex: 1,
  },
  name: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  currentUserName: {
    color: theme.colors.primary,
  },
  difference: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    marginTop: 2,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radii.round,
    backgroundColor: theme.colors.secondarySurface,
  },
  scorePillCurrentUser: {
    backgroundColor: theme.colors.primary,
  },
  score: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  scoreUnit: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  scoreCurrentUser: {
    color: theme.colors.surface,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  caption: {
    flexShrink: 1,
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    textAlign: 'center',
  },
  friendsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  friendsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
});
