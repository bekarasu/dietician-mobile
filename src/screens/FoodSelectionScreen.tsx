import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppButton } from '../components/AppButton';
import { FoodSelectionList } from '../components/FoodSelectionList';
import { ScreenContainer } from '../components/ScreenContainer';
import { AppStackParamList } from '../navigation/navigationTypes';
import { useProfileStore } from '../store/useProfileStore';
import { theme } from '../theme/theme';

type Props = NativeStackScreenProps<AppStackParamList, 'FoodSelection'>;

export function FoodSelectionScreen({ route, navigation }: Props) {
  const { selectedFoods: initialSelectedFoods, fieldName } = route.params;
  const [selectedFoods, setSelectedFoods] = useState<string[]>(initialSelectedFoods || []);
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
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
    if (!profile) {
      navigation.goBack();
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        ...profile,
        [fieldName]: selectedFoods,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save selection.');
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
        <AppButton title="Save Selection" onPress={handleSave} loading={isSaving} style={styles.saveButton} />
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
