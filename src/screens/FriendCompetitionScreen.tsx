import { StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../components/AppCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useProgressStore } from '../store/useProgressStore';
import { theme } from '../theme/theme';

export function FriendCompetitionScreen() {
  const friends = useProgressStore((state) => state.friends);

  return (
    <ScreenContainer>
      <SectionHeader
        title="Friend competition"
        subtitle="Ranking is based on mock progress, difficulty ratio, and weekly consistency. The current screen is a placeholder for future social and anti-abuse logic."
      />

      {friends.map((friend) => (
        <AppCard key={friend.id} style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: friend.avatarColor }]} />
            <View style={styles.identity}>
              <Text style={styles.name}>#{friend.rank} {friend.name}</Text>
              <Text style={styles.meta}>{friend.progressLabel}</Text>
            </View>
            <Text style={styles.score}>{friend.score}</Text>
          </View>
          <Text style={styles.detail}>Consistency {friend.consistency}% · Difficulty ratio {friend.difficultyRatio.toFixed(2)}</Text>
        </AppCard>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  identity: {
    flex: 1,
  },
  name: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  meta: {
    color: theme.colors.muted,
  },
  score: {
    color: theme.colors.primary,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '800',
  },
  detail: {
    color: theme.colors.text,
  },
});