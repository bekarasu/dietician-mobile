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
import { getGenerationDetail, isGenerationCancelled, runPlanGeneration } from '../features/dietPlan/planGeneration';
import { useCancelGeneration } from '../features/dietPlan/useCancelGeneration';
import { acceptSharedPlanOffer, askToSwitch, declineSharedPlanOffer } from '../features/sharedPlan/sharedPlanOffer';
import { AppStackParamList } from '../navigation/navigationTypes';
import { friendService } from '../services/friendService';
import { sharedPlanService } from '../services/sharedPlanService';
import { useDietPlanStore } from '../store/useDietPlanStore';
import { useSharedPlanOfferStore } from '../store/useSharedPlanOfferStore';
import { t } from '../i18n';
import { theme } from '../theme/theme';
import { Friend, SharedGroup, SharedGroupMember, SharedPlanInvite } from '../types/models';
import { formatCalendarDate, formatDateLabel, toCalendarDate } from '../utils/date';

type Props = NativeStackScreenProps<AppStackParamList, 'SharedPlan'>;

// The server's limit, until a group says otherwise.
const DEFAULT_MAX_FRIENDS = 2;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : t('common.errors.generic');
}

function joinNames(names: string[]) {
  if (names.length <= 1) {
    return names[0] ?? '';
  }
  return t('common.list.and', { items: names.slice(0, -1).join(', '), last: names[names.length - 1] });
}

function getMemberDetail(member: SharedGroupMember) {
  if (member.status === 'invited') {
    return t('sharedPlan.member.invited');
  }
  if (member.isOwner) {
    return t('sharedPlan.member.owner');
  }
  return member.joinedAt ? t('sharedPlan.member.joinedOn', { date: formatDateLabel(member.joinedAt) }) : t('sharedPlan.member.joined');
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
  // A shared plan the owner started, waiting for this member to switch to it.
  const offer = useSharedPlanOfferStore((state) => state.offer);
  const isAccepting = useSharedPlanOfferStore((state) => state.isAccepting);
  const { confirmCancel, isCancelling } = useCancelGeneration(isGenerating || isAccepting);
  const fetchActivePlan = useDietPlanStore((state) => state.fetchActivePlan);
  // A plan carries on generating after the screen is left, and only then says so.
  const isMounted = useRef(true);

  const load = useCallback(async () => {
    const [nextGroup, nextInvites, nextFriends] = await Promise.all([
      sharedPlanService.getGroup(),
      sharedPlanService.listInvites(),
      friendService.listFriends(),
      // Shown here, so the app-open prompt doesn't ask about it as well. The
      // rest of the screen works without it.
      useSharedPlanOfferStore
        .getState()
        .load({ seen: true })
        .catch(() => undefined),
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
      showDialog({ title: t('common.errors.title'), message: getErrorMessage(error), tone: 'danger' });
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
      title: t('sharedPlan.accept.title', { name: ownerName }),
      message: t('sharedPlan.accept.message', { name: ownerName }),
      icon: 'people-outline',
      buttons: [
        { text: t('common.actions.join'), onPress: () => run(invite.groupId, () => sharedPlanService.acceptInvite(invite.groupId)) },
        { text: t('common.actions.cancel'), style: 'cancel' },
      ],
    });
  };

  const confirmRemove = (member: SharedGroupMember) => {
    const isInvite = member.status === 'invited';
    showDialog({
      title: isInvite ? t('sharedPlan.remove.withdrawTitle') : t('sharedPlan.remove.removeTitle'),
      message: isInvite
        ? t('sharedPlan.remove.withdrawMessage', { name: member.displayName })
        : t('sharedPlan.remove.removeMessage', { name: member.displayName }),
      icon: 'person-remove-outline',
      buttons: [
        { text: t('common.actions.cancel'), style: 'cancel' },
        {
          text: isInvite ? t('common.actions.withdraw') : t('common.actions.remove'),
          style: 'destructive',
          onPress: () => run(member.userId, () => sharedPlanService.removeMember(member.userId)),
        },
      ],
    });
  };

  const confirmLeave = () => {
    showDialog({
      title: isOwner ? t('sharedPlan.leave.deleteTitle') : t('sharedPlan.leave.leaveTitle'),
      message: isOwner
        ? t('sharedPlan.leave.deleteMessage')
        : t('sharedPlan.leave.leaveMessage', { name: owner?.displayName ?? t('sharedPlan.leave.theOwner') }),
      icon: 'exit-outline',
      buttons: [
        { text: t('common.actions.cancel'), style: 'cancel' },
        { text: isOwner ? t('sharedPlan.leave.deleteGroup') : t('common.actions.leave'), style: 'destructive', onPress: () => run('leave', sharedPlanService.leave) },
      ],
    });
  };

  const createPlan = async () => {
    const names = joinNames(joinedFriends.map((member) => member.displayName));
    setIsGenerating(true);
    try {
      await runPlanGeneration(() => sharedPlanService.createSharedPlan(startDate));
      await fetchActivePlan();
      showDialog({
        title: t('sharedPlan.ready.title'),
        message: t('sharedPlan.ready.message', { names }),
        icon: 'checkmark-circle-outline',
        buttons: isMounted.current
          ? [{ text: t('sharedPlan.ready.seePlan'), onPress: () => isMounted.current && navigation.canGoBack() && navigation.goBack() }]
          : undefined,
      });
    } catch (error) {
      if (isGenerationCancelled(error)) {
        return;
      }
      showDialog({ title: t('sharedPlan.createFailed'), message: getErrorMessage(error), tone: 'danger' });
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmCreate = () => {
    const names = joinNames(joinedFriends.map((member) => member.displayName));
    showDialog({
      title: t('sharedPlan.start.title'),
      message: t('sharedPlan.start.message', { date: formatCalendarDate(startDate), names }),
      icon: 'restaurant-outline',
      buttons: [
        { text: t('sharedPlan.start.confirm'), onPress: createPlan },
        { text: t('common.actions.cancel'), style: 'cancel' },
      ],
    });
  };

  const getMemberActions = (member: SharedGroupMember): RowAction[] => {
    if (!group?.isOwner || member.isOwner) {
      return [];
    }
    return [
      {
        label: member.status === 'invited' ? t('common.actions.withdraw') : t('common.actions.remove'),
        icon: 'person-remove-outline',
        onPress: () => confirmRemove(member),
      },
    ];
  };

  // A shared plan waiting for this member, or their portions being prepared.
  const renderOfferCard = () => {
    if (isAccepting) {
      return (
        <View style={[styles.card, styles.centered]}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.cardTitle}>{t('sharedPlan.offerCard.switching')}</Text>
          <Text style={[styles.bodyText, styles.centeredText]}>{getGenerationDetail()}</Text>
          <AppButton title={t('dietPlan.generation.stop')} variant="ghost" loading={isCancelling} onPress={confirmCancel} />
        </View>
      );
    }
    if (!offer) {
      return null;
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('sharedPlan.offerCard.title', { name: offer.owner.displayName })}</Text>
        <Text style={styles.bodyText}>
          {t('sharedPlan.offerCard.body', { start: formatCalendarDate(offer.startDate), end: formatCalendarDate(offer.endDate) })}
        </Text>
        <AppButton
          title={t('sharedPlan.offerCard.switch')}
          onPress={() => void askToSwitch(offer, { onSwitch: () => void acceptSharedPlanOffer(), dismissText: t('common.actions.cancel') })}
        />
        <AppButton title={t('sharedPlan.offerCard.keep')} variant="ghost" onPress={() => void declineSharedPlanOffer()} />
      </View>
    );
  };

  const renderPlanCard = () => {
    if (!group) {
      return null;
    }

    if (!group.isOwner) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('sharedPlan.planCard.memberTitle')}</Text>
          <Text style={styles.bodyText}>
            {t('sharedPlan.planCard.memberBody', { name: owner?.displayName ?? t('sharedPlan.planCard.theOwner') })}
          </Text>
        </View>
      );
    }

    if (joinedFriends.length === 0) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('sharedPlan.planCard.startTitle')}</Text>
          <Text style={styles.bodyText}>{t('sharedPlan.planCard.waiting')}</Text>
        </View>
      );
    }

    if (isGenerating) {
      return (
        <View style={[styles.card, styles.centered]}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.cardTitle}>{t('sharedPlan.planCard.preparing')}</Text>
          <Text style={[styles.bodyText, styles.centeredText]}>{getGenerationDetail()}</Text>
          <AppButton title={t('dietPlan.generation.stop')} variant="ghost" loading={isCancelling} onPress={confirmCancel} />
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('sharedPlan.planCard.startTitle')}</Text>
        <Text style={styles.bodyText}>
          {t('sharedPlan.planCard.startBody')}
        </Text>
        <StartDatePicker firstDate={today} onChange={setStartDate} value={startDate} />
        <AppButton title={t('sharedPlan.planCard.create')} onPress={confirmCreate} />
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
        title={t('sharedPlan.header.title')}
        subtitle={t('sharedPlan.header.subtitle', { count: maxFriends })}
      />

      {isLoading ? <ActivityIndicator color={theme.colors.primary} style={styles.loading} /> : null}

      {failed ? (
        <View style={[styles.card, styles.centered]}>
          <View style={styles.stateIcon}>
            <Ionicons color={theme.colors.primary} name="cloud-offline-outline" size={28} />
          </View>
          <Text style={[styles.bodyText, styles.centeredText]}>{t('sharedPlan.loadFailed')}</Text>
          <AppButton title={t('common.actions.tryAgain')} onPress={loadScreen} variant="secondary" />
        </View>
      ) : null}

      {!isLoading && !failed ? (
        <>
          {invites.length > 0 ? (
            <ListCard title={t('sharedPlan.invitations')}>
              {invites.map((invite) => {
                const groupmates = invite.members.filter((member) => !member.isOwner).map((member) => member.displayName);
                return (
                  <UserRow
                    key={invite.groupId}
                    actions={[
                      { label: t('common.actions.join'), tone: 'primary', onPress: () => confirmAccept(invite) },
                      { label: t('common.actions.decline'), onPress: () => run(invite.groupId, () => sharedPlanService.declineInvite(invite.groupId)) },
                    ]}
                    busy={busyId === invite.groupId}
                    detail={groupmates.length > 0 ? t('sharedPlan.withNames', { names: joinNames(groupmates) }) : t('sharedPlan.invitedOn', { date: formatDateLabel(invite.invitedAt) })}
                    name={invite.owner.displayName}
                    stacked
                    userId={invite.owner.userId}
                  />
                );
              })}
            </ListCard>
          ) : null}

          {group ? (
            <ListCard meta={t('sharedPlan.group.meta', { count: others.length, max: maxFriends })} title={t('sharedPlan.group.title')}>
              {group.members.map((member) => (
                <UserRow
                  key={member.userId}
                  actions={getMemberActions(member)}
                  busy={busyId === member.userId}
                  detail={getMemberDetail(member)}
                  name={member.isCurrentUser ? t('common.you', { name: member.displayName }) : member.displayName}
                  userId={member.userId}
                />
              ))}
            </ListCard>
          ) : null}

          {renderOfferCard()}

          {renderPlanCard()}

          {isOwner && slotsLeft > 0 ? (
            <ListCard meta={t('sharedPlan.inviteFriends.spotsLeft', { count: slotsLeft })} title={t('sharedPlan.inviteFriends.title')}>
              {invitableFriends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.bodyText, styles.centeredText]}>
                    {friends.length === 0 ? t('sharedPlan.inviteFriends.noFriends') : t('sharedPlan.inviteFriends.allInvited')}
                  </Text>
                  {friends.length === 0 ? (
                    <AppButton title={t('sharedPlan.inviteFriends.findFriends')} variant="secondary" onPress={() => navigation.navigate('Friends')} />
                  ) : null}
                </View>
              ) : null}
              {invitableFriends.map((friend) => (
                <UserRow
                  key={friend.userId}
                  actions={[
                    { label: t('common.actions.invite'), tone: 'primary', onPress: () => run(friend.userId, () => sharedPlanService.invite(friend.userId)) },
                  ]}
                  busy={busyId === friend.userId}
                  detail={t('sharedPlan.inviteFriends.friendsSince', { date: formatDateLabel(friend.friendsSince) })}
                  name={friend.displayName}
                  userId={friend.userId}
                />
              ))}
            </ListCard>
          ) : null}

          {group ? (
            <AppButton
              title={group.isOwner ? t('sharedPlan.leave.deleteGroup') : t('sharedPlan.leave.leaveGroup')}
              variant="ghost"
              loading={busyId === 'leave'}
              disabled={isGenerating || isAccepting}
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
