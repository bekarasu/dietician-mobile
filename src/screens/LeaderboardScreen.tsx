import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { SegmentedControl } from '../components/SegmentedControl';
import { UserAvatar } from '../components/UserAvatar';
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
        Alert.alert('Error', LOAD_ERROR);
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
      <SectionHeader title="Leaderboard" subtitle="See how your progress compares with friends and everyone else." />

      <SegmentedControl options={SCOPE_OPTIONS} value={scope} onChange={changeScope} />
      <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={changePeriod} />

      {failed ? (
        <AppCard style={styles.stack}>
          <Text style={styles.body}>{LOAD_ERROR}</Text>
          <AppButton title="Try again" onPress={retry} variant="secondary" />
        </AppCard>
      ) : null}

      {!failed && !board ? <ActivityIndicator color={theme.colors.primary} style={styles.loading} /> : null}

      {board ? (
        <>
          <PeriodNavigator board={board} onChange={changePeriodStart} />
          <StandingCard
            board={board}
            onExplain={() => navigation.navigate('ScoreBreakdown', { period, periodStart: board.periodStart })}
          />

          {board.participants.length > 0 ? (
            <AppCard style={styles.rankings}>
              {board.participants.map((entry) => (
                <RankingRow key={entry.userId} entry={entry} />
              ))}
            </AppCard>
          ) : (
            <AppCard>
              <Text style={styles.body}>{getEmptyMessage(scope, board)}</Text>
            </AppCard>
          )}

          {board.hasMore ? (
            <AppButton title="Show more" onPress={loadMore} loading={isLoadingMore} variant="secondary" />
          ) : null}

          {board.nextPeriodStart === null ? (
            <Text style={styles.caption}>
              Live: scores update as people log.
              {board.lastUpdatedAt ? ` Last change ${formatDateTimeLabel(board.lastUpdatedAt)}.` : ''}
            </Text>
          ) : board.lastUpdatedAt ? (
            <Text style={styles.caption}>Updated {formatDateTimeLabel(board.lastUpdatedAt)}</Text>
          ) : null}

          {scope === 'friends' ? (
            <AppButton
              title={board.friendCount === 0 ? 'Find friends' : 'Manage friends'}
              onPress={() => navigation.navigate('Friends')}
              variant="secondary"
            />
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
  const { nextPeriodStart, periodType, periodStart, periodEndExclusive, previousPeriodStart } = board;
  const label = periodType === 'weekly' ? formatWeekRange(periodStart, periodEndExclusive) : formatMonth(periodStart);

  return (
    <View style={styles.periodRow}>
      <Pressable
        accessibilityLabel="Previous period"
        accessibilityRole="button"
        hitSlop={theme.spacing.sm}
        onPress={() => onChange(previousPeriodStart)}
      >
        <Ionicons color={theme.colors.primary} name="chevron-back" size={24} />
      </Pressable>
      <Text style={styles.periodLabel}>{label}</Text>
      <Pressable
        accessibilityLabel="Next period"
        accessibilityRole="button"
        accessibilityState={{ disabled: nextPeriodStart === null }}
        disabled={nextPeriodStart === null}
        hitSlop={theme.spacing.sm}
        onPress={() => nextPeriodStart && onChange(nextPeriodStart)}
      >
        <Ionicons
          color={nextPeriodStart === null ? theme.colors.border : theme.colors.primary}
          name="chevron-forward"
          size={24}
        />
      </Pressable>
    </View>
  );
}

interface StandingCardProps {
  board: Leaderboard;
  onExplain: () => void;
}

function StandingCard({ board, onExplain }: StandingCardProps) {
  const { currentUser } = board;
  const comparison = getComparisonMessage(board);

  return (
    <AppCard style={styles.standingCard}>
      <Text style={styles.standingLabel}>YOUR POSITION</Text>
      {currentUser.rank === null ? (
        <Text style={styles.standingMessage}>{getStatusMessage(currentUser.statusReason)}</Text>
      ) : (
        <>
          <Text style={styles.standingRank}>#{currentUser.rank}</Text>
          <Text style={styles.standingScore}>{currentUser.totalScore} points</Text>
        </>
      )}
      {comparison ? <Text style={styles.standingMessage}>{comparison}</Text> : null}
      <Pressable accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={onExplain}>
        <Text style={styles.standingLink}>How is my score calculated?</Text>
      </Pressable>
    </AppCard>
  );
}

function RankingRow({ entry }: { entry: LeaderboardEntry }) {
  const differenceLabel = getDifferenceLabel(entry);

  return (
    <View style={[styles.row, entry.isCurrentUser ? styles.rowCurrentUser : undefined]}>
      <Text style={styles.rank}>{entry.rank}</Text>
      <UserAvatar name={entry.displayName} />
      <View style={styles.identity}>
        <Text numberOfLines={1} style={styles.name}>
          {entry.isCurrentUser ? 'You' : entry.displayName}
        </Text>
        {differenceLabel ? <Text style={styles.difference}>{differenceLabel}</Text> : null}
      </View>
      <Text style={styles.score}>{entry.totalScore} pts</Text>
    </View>
  );
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
  stack: {
    gap: theme.spacing.lg,
  },
  body: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  loading: {
    marginTop: theme.spacing.xl,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
  },
  standingCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },
  standingLabel: {
    color: theme.colors.surface,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.8,
  },
  standingRank: {
    color: theme.colors.surface,
    fontSize: theme.typography.hero.fontSize,
    fontWeight: '800',
    lineHeight: theme.typography.hero.lineHeight,
  },
  standingScore: {
    color: theme.colors.surface,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
  },
  standingMessage: {
    color: theme.colors.surface,
    lineHeight: 22,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
  standingLink: {
    color: theme.colors.surface,
    fontWeight: '700',
    marginTop: theme.spacing.sm,
    textDecorationLine: 'underline',
  },
  rankings: {
    gap: theme.spacing.xs,
    padding: theme.spacing.sm,
  },
  row: {
    alignItems: 'center',
    borderRadius: theme.radii.lg,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
  },
  rowCurrentUser: {
    backgroundColor: theme.colors.secondarySurface,
  },
  rank: {
    color: theme.colors.muted,
    fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  identity: {
    flex: 1,
  },
  name: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  difference: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    marginTop: 2,
  },
  score: {
    color: theme.colors.primary,
    fontWeight: '800',
  },
  caption: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    textAlign: 'center',
  },
});
