import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { FoodSelectionList } from '../components/FoodSelectionList';
import { ScreenContainer } from '../components/ScreenContainer';
import { showDialog } from '../features/dialog/dialogStore';
import { AppStackParamList } from '../navigation/navigationTypes';
import { getErrorMessage } from '../services/apiError';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useProfileStore } from '../store/useProfileStore';
import { t } from '../i18n';
import { theme } from '../theme/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'FoodSelection'>;

export function FoodSelectionScreen({ route, navigation }: Props) {
  const { selectedFoods: initialSelectedFoods, fieldName, context = 'profile' } = route.params;
  const [selectedFoods, setSelectedFoods] = useState<string[]>(initialSelectedFoods || []);
  const profile = useProfileStore((state) => state.profile);
  const updatePreferences = useProfileStore((state) => state.updatePreferences);
  const updateField = useOnboardingStore((state) => state.updateField);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleFood = (foodName: string) => {
    setSelectedFoods((prev) => {
      if (prev.includes(foodName)) {
        return prev.filter((name) => name !== foodName);
      }
      return [...prev, foodName];
    });
  };

  const handleSave = async () => {
    if (context === 'onboarding') {
      updateField(fieldName as any, selectedFoods.join(', '));
      navigation.goBack();
      return;
    }

    if (!profile) {
      navigation.goBack();
      return;
    }

    setIsSaving(true);
    try {
      // Only the list being edited is sent, so the other one stays as it is.
      await updatePreferences(fieldName === 'allergies' ? { allergies: selectedFoods } : { dislikedFoods: selectedFoods });
      navigation.goBack();
    } catch (error) {
      showDialog({ title: t('common.errors.title'), message: getErrorMessage(error, t('dietPlan.foodSelection.saveFailed')), tone: 'danger' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer scrollable={false} contentStyle={{ flex: 1 }}>
      <View style={styles.container}>
        <FoodSelectionList
          selectedFoodNames={selectedFoods}
          onToggleFood={handleToggleFood}
        />
        <AppButton title={t('dietPlan.foodSelection.save')} onPress={handleSave} loading={isSaving} style={styles.saveButton} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.md,
  },
  saveButton: {
    marginTop: theme.spacing.md,
  },
});
