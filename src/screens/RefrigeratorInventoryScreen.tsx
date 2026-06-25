import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { INVENTORY_CATEGORIES } from '../constants/options';
import { useInventoryStore } from '../store/useInventoryStore';
import { theme } from '../theme/theme';
import { RefrigeratorItemInput } from '../types/models';
import { formatDateLabel } from '../utils/date';

export function RefrigeratorInventoryScreen() {
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
    <ScreenContainer>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  formCard: {
    gap: theme.spacing.md,
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