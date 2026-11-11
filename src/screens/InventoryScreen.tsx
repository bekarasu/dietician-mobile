import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { AppTextInput } from '../components/AppTextInput';
import { ScreenContainer } from '../components/ScreenContainer';
import { SectionHeader } from '../components/SectionHeader';
import { showDialog } from '../features/dialog/dialogStore';
import { getErrorMessage } from '../services/apiError';
import { useProfileStore } from '../store/useProfileStore';
import { t } from '../i18n';
import { theme } from '../theme/theme';

export function InventoryScreen() {
  const profile = useProfileStore((state) => state.profile);
  const updatePreferences = useProfileStore((state) => state.updatePreferences);

  const items = profile?.availableIngredients || [];

  const { control, handleSubmit, reset } = useForm<{ ingredient: string }>({
    defaultValues: {
      ingredient: '',
    },
  });

  const onSubmit = async (values: { ingredient: string }) => {
    if (!profile) return;
    const newItems = [values.ingredient, ...items];
    try {
      await updatePreferences({ availableIngredients: newItems });
      reset({ ingredient: '' });
    } catch (error) {
      showDialog({ title: t('common.errors.title'), message: getErrorMessage(error, t('inventory.addFailed')), tone: 'danger' });
    }
  };

  const removeItem = async (ingredientToRemove: string) => {
    if (!profile) return;
    const newItems = items.filter(item => item !== ingredientToRemove);
    try {
      await updatePreferences({ availableIngredients: newItems });
    } catch (error) {
      showDialog({ title: t('common.errors.title'), message: getErrorMessage(error, t('inventory.removeFailed')), tone: 'danger' });
    }
  };

  return (
    <ScreenContainer>
      <SectionHeader
        title={t('inventory.title')}
        subtitle={t('inventory.subtitle')}
      />

      <AppCard style={styles.formCard}>
        <Controller
          control={control}
          name="ingredient"
          rules={{ required: t('inventory.required') }}
          render={({ field: { onBlur, onChange, value }, fieldState: { error } }) => (
            <AppTextInput label={t('inventory.label')} onBlur={onBlur} onChangeText={onChange} value={value} error={error?.message} />
          )}
        />
        <AppButton title={t('inventory.add')} onPress={handleSubmit(onSubmit)} />
      </AppCard>

      {items.map((item, index) => (
        <AppCard key={`${item}-${index}`} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemTitleBlock}>
              <Text style={styles.itemTitle}>{item}</Text>
            </View>
            <AppButton title={t('common.actions.remove')} variant="ghost" onPress={() => removeItem(item)} />
          </View>
        </AppCard>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  formCard: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  itemCard: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
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
});
