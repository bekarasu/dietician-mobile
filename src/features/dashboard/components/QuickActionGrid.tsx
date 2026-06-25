import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppCard } from '../../../components/AppCard';
import { theme } from '../../../theme/theme';

export interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  onPress: () => void;
}

interface QuickActionGridProps {
  actions: QuickActionItem[];
}

export function QuickActionGrid({ actions }: QuickActionGridProps) {
  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable key={action.id} onPress={action.onPress} style={({ pressed }) => [styles.item, pressed ? styles.pressed : undefined]}>
          <AppCard>
            <Text style={styles.title}>{action.title}</Text>
            <Text style={styles.description}>{action.description}</Text>
          </AppCard>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  item: {
    width: '47%',
  },
  pressed: {
    opacity: 0.85,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  description: {
    color: theme.colors.muted,
    lineHeight: 20,
  },
});