import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { StartDatePicker } from '../components/StartDatePicker';
import { ListCard, RowAction, UserRow } from '../components/UserList';
import { showDialog } from '../features/dialog/dialogStore';
import { GENERATION_DETAIL, isGenerationCancelled, runPlanGeneration } from '../features/dietPlan/planGeneration';
import { useCancelGeneration } from '../features/dietPlan/useCancelGeneration';
import { AppStackParamList } from '../navigation/navigationTypes';
import { friendService } from '../services/friendService';
import { sharedPlanService } from '../services/sharedPlanService';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { theme } from '../theme/theme';
import { Friend, SharedGroup, SharedGroupMember, SharedPlanInvite } from '../types/models';
import { formatCalendarDate, formatDateLabel, toCalendarDate } from '../utils/date';

type Props = NativeStackScreenProps<AppStackParamList, 'SharedPlan'>;

// The server's limit, until a group says otherwise.
const DEFAULT_MAX_FRIENDS = 2;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function joinNames(names: string[]) {
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function getMemberDetail(member: SharedGroupMember) {
  if (member.status === 'invited') {
    return 'Invited, waiting for an answer';
  }
  if (member.isOwner) {
    return 'Started the group';
  }
  return member.joinedAt ? `Joined ${formatDateLabel(member.joinedAt)}` : 'Joined';
}

export function SharedPlanScreen({ navigation }: Props) {
  const [group, setGroup] = useState<SharedGroup | null>(null);
  const [invites, setInvites] = useState<SharedPlanInvite[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [today] = useState(() => toCalendarDate(new Date()));
  const [startDate, setStartDate] = useState(today);
  const [isGenerating, setIsGenerating] = useState(false);
  const { confirmCancel, isCancelling } = useCancelGeneration(isGenerating);
  const fetchActivePlan = useDietPlanStore((state) => state.fetchActivePlan);
  // A plan carries on generating after the screen is left, and only then says so.
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    const [nextGroup, nextInvites, nextFriends] = await Promise.all([
      sharedPlanService.getGroup(),
      sharedPlanService.listInvites(),
      friendService.listFriends(),
    ]);
    setGroup(nextGroup);
    setInvites(nextInvites);
    setFriends(nextFriends);
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

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Invitations and answers arrive while the screen is open.
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

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      await load();
    } catch (error) {
      showDialog({ title: 'Error', message: getErrorMessage(error), tone: 'danger' });
    } finally {
      setBusyId(null);
    }
  };

  const maxFriends = group?.maxFriends ?? DEFAULT_MAX_FRIENDS;
  const others = group?.members.filter((member) => !member.isOwner) ?? [];
  const joinedFriends = others.filter((member) => member.status === 'joined');
  const owner = group?.members.find((member) => member.isOwner);
  const isOwner = group === null || group.isOwner;
  const memberIds = new Set(group?.members.map((member) => member.userId));
  const invitableFriends = friends.filter((friend) => !memberIds.has(friend.userId));
  const slotsLeft = maxFriends - others.length;

  const confirmAccept = (invite: SharedPlanInvite) => {
    const ownerName = invite.owner.displayName;
    showDialog({
      title: `Share meals with ${ownerName}?`,
      message: `You'll eat the same meals as the group, in portions for your own goal and weight. When ${ownerName} starts a shared plan, it replaces your plan from its start date, and if your plan is running then, the meal, water and coffee points from your plan earlier that week are reset. You can leave at any time.`,
      icon: 'people-outline',
      buttons: [
        { text: 'Join', onPress: () => run(invite.groupId, () => sharedPlanService.acceptInvite(invite.groupId)) },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  const confirmRemove = (member: SharedGroupMember) => {
    const isInvite = member.status === 'invited';
    showDialog({
      title: isInvite ? 'Withdraw invitation' : 'Remove from group',
      message: isInvite
        ? `Withdraw ${member.displayName}'s invitation?`
        : `Remove ${member.displayName}? Their current plan stays as it is, and your next shared plans won't include them.`,
      icon: 'person-remove-outline',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isInvite ? 'Withdraw' : 'Remove',
          style: 'destructive',
          onPress: () => run(member.userId, () => sharedPlanService.removeMember(member.userId)),
        },
      ],
    });
  };

  const confirmLeave = () => {
    showDialog({
      title: isOwner ? 'Delete your group?' : 'Leave the group?',
      message: isOwner
        ? "Everyone's current plan stays as it is, but you won't share new plans any more."
        : `Your current plan stays as it is, and ${owner?.displayName ?? 'the owner'}'s next shared plans won't replace it.`,
      icon: 'exit-outline',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: isOwner ? 'Delete group' : 'Leave', style: 'destructive', onPress: () => run('leave', sharedPlanService.leave) },
      ],
    });
  };

  const createPlan = async () => {
    setIsGenerating(true);
    try {
      await runPlanGeneration(() => sharedPlanService.createSharedPlan(startDate));
      await fetchActivePlan();
      showDialog({
        title: 'Your shared plan is ready',
        message: 'Everyone in your group has the same meals now, each with portions for their own goal.',
        icon: 'checkmark-circle-outline',
        buttons: isMounted.current
          ? [{ text: 'See my plan', onPress: () => isMounted.current && navigation.canGoBack() && navigation.goBack() }]
          : undefined,
      });
    } catch (error) {
      if (isGenerationCancelled(error)) {
        return;
      }
      showDialog({ title: "We couldn't prepare the shared plan", message: getErrorMessage(error), tone: 'danger' });
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmCreate = () => {
    const names = joinNames(joinedFriends.map((member) => member.displayName));
    showDialog({
      title: 'Start a shared plan?',
      message: `You and ${names} will get the same meals from ${formatCalendarDate(startDate)}, each in portions for your own goal and weight. It replaces each of your plans from that day. Anyone whose plan is running then has the meal, water and coffee points from their plan earlier that week reset.`,
      icon: 'restaurant-outline',
      buttons: [
        { text: 'Start shared plan', onPress: createPlan },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
  };

  const getMemberActions = (member: SharedGroupMember): RowAction[] => {
    if (!group?.isOwner || member.isOwner) {
      return [];
    }
    return [
      {
        label: member.status === 'invited' ? 'Withdraw' : 'Remove',
        icon: 'person-remove-outline',
        onPress: () => confirmRemove(member),
      },
    ];
  };

  const renderPlanCard = () => {
    if (!group) {
      return null;
    }

    if (!group.isOwner) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shared plans</Text>
          <Text style={styles.bodyText}>
            {owner?.displayName ?? 'The owner'} starts the group's shared plans and renews them. You'll get a notification when
            yours is ready. You can still swap meals, which changes them for everyone who hasn't eaten them yet.
          </Text>
        </View>
      );
    }

    if (joinedFriends.length === 0) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Start a shared plan</Text>
          <Text style={styles.bodyText}>Once a friend accepts your invitation, you can start a plan for all of you.</Text>
        </View>
      );
    }

    if (isGenerating) {
      return (
        <View style={[styles.card, styles.centered]}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.cardTitle}>Preparing your shared plan</Text>
          <Text style={[styles.bodyText, styles.centeredText]}>{GENERATION_DETAIL}</Text>
          <AppButton title="Stop" variant="ghost" loading={isCancelling} onPress={confirmCancel} />
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Start a shared plan</Text>
        <Text style={styles.bodyText}>
          Everyone gets the same meals, with portions worked out from their own goal and weight. Meals avoid every member's
          allergies, dislikes and diet. Pick a day you'll all have time to shop for.
        </Text>
        <StartDatePicker firstDate={today} onChange={setStartDate} value={startDate} />
        <AppButton title="Create shared plan" onPress={confirmCreate} />
      </View>
    );
  };

  return (
    <ScreenContainer
      scrollViewProps={{
        bounces: true,
        refreshControl: <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={theme.colors.primary} />,
      }}
    >
      <SectionHeader
        title="Share meals"
        subtitle={`Eat the same meals with up to ${maxFriends} friends. Each of you gets portions for your own goal and weight.`}
      />

      {isLoading ? <ActivityIndicator color={theme.colors.primary} style={styles.loading} /> : null}

      {failed ? (
        <View style={[styles.card, styles.centered]}>
          <View style={styles.stateIcon}>
            <Ionicons color={theme.colors.primary} name="cloud-offline-outline" size={28} />
          </View>
          <Text style={[styles.bodyText, styles.centeredText]}>We couldn't load your shared meals. Please try again.</Text>
          <AppButton title="Try again" onPress={loadScreen} variant="secondary" />
        </View>
      ) : null}

      {!isLoading && !failed ? (
        <>
          {invites.length > 0 ? (
            <ListCard title="Invitations">
              {invites.map((invite) => {
                const groupmates = invite.members.filter((member) => !member.isOwner).map((member) => member.displayName);
                return (
                  <UserRow
                    key={invite.groupId}
                    actions={[
                      { label: 'Join', tone: 'primary', onPress: () => confirmAccept(invite) },
                      { label: 'Decline', onPress: () => run(invite.groupId, () => sharedPlanService.declineInvite(invite.groupId)) },
                    ]}
                    busy={busyId === invite.groupId}
                    detail={groupmates.length > 0 ? `With ${joinNames(groupmates)}` : `Invited ${formatDateLabel(invite.invitedAt)}`}
                    name={invite.owner.displayName}
                    stacked
                    userId={invite.owner.userId}
                  />
                );
              })}
            </ListCard>
          ) : null}

          {group ? (
            <ListCard meta={`${others.length} of ${maxFriends} friends`} title="Your group">
              {group.members.map((member) => (
                <UserRow
                  key={member.userId}
                  actions={getMemberActions(member)}
                  busy={busyId === member.userId}
                  detail={getMemberDetail(member)}
                  name={member.isCurrentUser ? `${member.displayName} (you)` : member.displayName}
                  userId={member.userId}
                />
              ))}
            </ListCard>
          ) : null}

          {renderPlanCard()}

          {isOwner && slotsLeft > 0 ? (
            <ListCard meta={`${slotsLeft} ${slotsLeft === 1 ? 'spot' : 'spots'} left`} title="Invite friends">
              {invitableFriends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.bodyText, styles.centeredText]}>
                    {friends.length === 0 ? 'Add friends first, then invite them to share meals.' : 'Everyone you could invite is already in your group.'}
                  </Text>
                  {friends.length === 0 ? (
                    <AppButton title="Find friends" variant="secondary" onPress={() => navigation.navigate('Friends')} />
                  ) : null}
                </View>
              ) : null}
              {invitableFriends.map((friend) => (
                <UserRow
                  key={friend.userId}
                  actions={[
                    { label: 'Invite', tone: 'primary', onPress: () => run(friend.userId, () => sharedPlanService.invite(friend.userId)) },
                  ]}
                  busy={busyId === friend.userId}
                  detail={`Friends since ${formatDateLabel(friend.friendsSince)}`}
                  name={friend.displayName}
                  userId={friend.userId}
                />
              ))}
            </ListCard>
          ) : null}

          {group ? (
            <AppButton
              title={group.isOwner ? 'Delete group' : 'Leave group'}
              variant="ghost"
              loading={busyId === 'leave'}
              disabled={isGenerating}
              onPress={confirmLeave}
            />
          ) : null}
        </>
      ) : null}
    </ScreenContainer>
  );
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
  centered: {
    alignItems: 'center',
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  bodyText: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  centeredText: {
    textAlign: 'center',
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primarySoft,
  },
  emptyState: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
});
