import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { INVENTORY_CATEGORIES } from '../constants/options';
import { useDailyLogStore } from '../store/useDailyLogStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { theme } from '../theme/theme';
import { DailyFoodLogInput, RefrigeratorItemInput } from '../types/models';
import { formatDateLabel } from '../utils/date';

function DailyFoodLogView() {
  const logs = useDailyLogStore((state) => state.logs);
  const addLog = useDailyLogStore((state) => state.addLog);

  const { control, handleSubmit, reset } = useForm<DailyFoodLogInput>({
    defaultValues: {
      foodName: '',
      estimatedAmount: '',
      estimatedCalories: 0,
      notes: '',
    },
  });

  const onSubmit = (values: DailyFoodLogInput) => {
    addLog(values);
    reset({ foodName: '', estimatedAmount: '', estimatedCalories: 0, notes: '' });
  };

  return (
    <View style={styles.tabContent}>
      <SectionHeader
        title="Daily over-consumption log"
        subtitle="Capture the food, approximate portion, and notes. The recovery copy stays intentionally conservative and avoids crash-diet advice."
      />

      <AppCard style={styles.formCard}>
        <Controller
          control={control}
          name="foodName"
          rules={{ required: 'Food name is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label="Food name" onBlur={onBlur} onChangeText={onChange} value={value} error={error?.message} />
          )}
        />
        <Controller
          control={control}
          name="estimatedAmount"
          rules={{ required: 'Estimated amount is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label="Estimated amount" onBlur={onBlur} onChangeText={onChange} value={value} error={error?.message} />
          )}
        />
        <Controller
          control={control}
          name="estimatedCalories"
          rules={{ required: 'Estimated calories are required', min: { value: 1, message: 'Calories must be above zero' } }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput
              keyboardType="numeric"
              label="Estimated calories"
              onBlur={onBlur}
              onChangeText={(text) => onChange(Number(text) || 0)}
              value={value ? String(value) : ''}
              error={error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field: { onBlur, onChange, value } }) => (
            <AppTextInput label="Notes" multiline onBlur={onBlur} onChangeText={onChange} placeholder="Context, cravings, event, energy level..." value={value} />
          )}
        />

        <AppButton title="Save log" onPress={handleSubmit(onSubmit)} />
      </AppCard>

      {logs.map((log) => (
        <AppCard key={log.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>{log.foodName}</Text>
            <Text style={styles.logDate}>{formatDateLabel(log.createdAt)}</Text>
          </View>
          <Text style={styles.logMeta}>
            {log.estimatedAmount} · {log.estimatedCalories} kcal
          </Text>
          {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
          <View style={styles.recoveryBox}>
            <Text style={styles.recoveryLabel}>Recovery recommendation</Text>
            <Text style={styles.recoveryText}>{log.recoveryRecommendation}</Text>
          </View>
        </AppCard>
      ))}
    </View>
  );
}

function RefrigeratorInventoryView() {
  const items = useInventoryStore((state) => state.items);
  const addItem = useInventoryStore((state) => state.addItem);
  const removeItem = useInventoryStore((state) => state.removeItem);

  const { control, handleSubmit, reset } = useForm<RefrigeratorItemInput>({
    defaultValues: {
      productName: '',
      category: INVENTORY_CATEGORIES[0],
      quantity: '',
      expirationDate: '',
    },
  });

  const onSubmit = (values: RefrigeratorItemInput) => {
    addItem(values);
    reset({ productName: '', category: INVENTORY_CATEGORIES[0], quantity: '', expirationDate: '' });
  };

  return (
    <View style={styles.tabContent}>
      <SectionHeader
        title="Refrigerator inventory"
        subtitle="Keep this list close to the recommendation engine so meal plans can prefer what is already available at home."
      />

      <AppCard style={styles.formCard}>
        <Controller
          control={control}
          name="productName"
          rules={{ required: 'Product name is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label="Product name" onBlur={onBlur} onChangeText={onChange} value={value} error={error?.message} />
          )}
        />
        <Controller
          control={control}
          name="category"
          rules={{ required: 'Category is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput
              label="Category"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={`Examples: ${INVENTORY_CATEGORIES.join(', ')}`}
              value={value}
              error={error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="quantity"
          rules={{ required: 'Quantity is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label="Quantity" onBlur={onBlur} onChangeText={onChange} value={value} error={error?.message} />
          )}
        />
        <Controller
          control={control}
          name="expirationDate"
          rules={{ required: 'Expiration date is required' }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label="Expiration date" onBlur={onBlur} onChangeText={onChange} placeholder="YYYY-MM-DD" value={value} error={error?.message} />
          )}
        />

        <AppButton title="Add item" onPress={handleSubmit(onSubmit)} />
      </AppCard>

      {items.map((item) => (
        <AppCard key={item.id} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemTitleBlock}>
              <Text style={styles.itemTitle}>{item.productName}</Text>
              <Text style={styles.itemMeta}>
                {item.category} · {item.quantity}
              </Text>
            </View>
            <AppButton title="Remove" variant="ghost" onPress={() => removeItem(item.id)} />
          </View>
          <Text style={styles.itemExpiry}>Expires {formatDateLabel(item.expirationDate)}</Text>
        </AppCard>
      ))}
    </View>
  );
}

export function DailyFoodLogScreen() {
  const [activeTab, setActiveTab] = useState<'log' | 'inventory'>('log');

  return (
    <ScreenContainer>
      <View style={styles.segmentContainer}>
        <Pressable
          style={[styles.segment, activeTab === 'log' && styles.activeSegment]}
          onPress={() => setActiveTab('log')}
        >
          <Text style={[styles.segmentText, activeTab === 'log' && styles.activeSegmentText]}>Food Log</Text>
        </Pressable>
        <Pressable
          style={[styles.segment, activeTab === 'inventory' && styles.activeSegment]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.segmentText, activeTab === 'inventory' && styles.activeSegmentText]}>Inventory</Text>
        </Pressable>
      </View>

      {activeTab === 'log' ? <DailyFoodLogView /> : <RefrigeratorInventoryView />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.secondarySurface,
    padding: theme.spacing.xs,
    borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeSegment: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  activeSegmentText: {
    color: theme.colors.text,
  },
  tabContent: {
    gap: theme.spacing.lg,
  },
  formCard: {
    gap: theme.spacing.md,
  },
  logCard: {
    gap: theme.spacing.sm,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  logTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    flex: 1,
  },
  logDate: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  logMeta: {
    color: theme.colors.muted,
  },
  logNotes: {
    color: theme.colors.text,
    lineHeight: 22,
  },
  recoveryBox: {
    backgroundColor: theme.colors.secondarySurface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  recoveryLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  recoveryText: {
    color: theme.colors.muted,
    lineHeight: 22,
  },
  itemCard: {
    gap: theme.spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    alignItems: 'center',
  },
  itemTitleBlock: {
    flex: 1,
  },
  itemTitle: {
    color: theme.colors.text,
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  itemMeta: {
    color: theme.colors.muted,
  },
  itemExpiry: {
    color: theme.colors.text,
  },
});