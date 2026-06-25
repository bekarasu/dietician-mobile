import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { ProgressBar } from '../components/ProgressBar';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { useHydrationStore } from '../store/useHydrationStore';
import { theme } from '../theme/theme';

export function HydrationTrackingScreen() {
  const hydration = useHydrationStore((state) => state.hydration);
  const coffee = useHydrationStore((state) => state.coffee);
  const addWater = useHydrationStore((state) => state.addWater);
  const addCoffee = useHydrationStore((state) => state.addCoffee);

  return (
    <ScreenContainer>
      <SectionHeader
        title="Water and coffee tracking"
        subtitle="Simple daily counters for hydration and caffeine. Future versions can connect this to reminders, wearable data, or trend analytics."
      />

      <AppCard style={styles.stack}>
        <Text style={styles.cardTitle}>Hydration</Text>
        <ProgressBar label="Water intake" current={hydration.waterMl} target={hydration.targetWaterMl} suffix=" ml" />
        <View style={styles.actions}>
          <AppButton title="+250 ml" onPress={() => addWater(250)} />
          <AppButton title="+500 ml" variant="secondary" onPress={() => addWater(500)} />
        </View>
      </AppCard>

      <AppCard style={styles.stack}>
        <Text style={styles.cardTitle}>Coffee</Text>
        <ProgressBar label="Coffee cups" current={coffee.cups} target={coffee.targetCups} suffix=" cups" />
        <View style={styles.actions}>
          <AppButton title="+1 cup" onPress={() => addCoffee(1)} />
          <AppButton title="+2 cups" variant="secondary" onPress={() => addCoffee(2)} />
        </View>
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: theme.spacing.md,
  },
  cardTitle: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
});