import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppTextInput } from './AppTextInput';
import { recommendationService } from '../services/recommendationService';
import { t } from '../i18n';
import { theme } from '../theme/theme';
import { FoodResponse } from '../types/models';

interface FoodSelectionListProps {
  selectedFoodNames: string[];
  onToggleFood: (foodName: string) => void;
}

export function FoodSelectionList({ selectedFoodNames, onToggleFood }: FoodSelectionListProps) {
  const [foods, setFoods] = useState<FoodResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFoods() {
      try {
        const fetchedFoods = await recommendationService.listFoods();
        setFoods(fetchedFoods);
      } catch (error) {
        console.error('Failed to fetch foods:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchFoods();
  }, []);

  // Choices are saved by the name shown, so one saved in the other language
  // matches the food's English name or, failing that, nothing.
  const isSelected = (food: FoodResponse) =>
    selectedFoodNames.includes(food.name) || (!!food.english_name && selectedFoodNames.includes(food.english_name));

  const query = searchQuery.toLowerCase();
  const filteredFoods = foods
    .filter((food) => food.name.toLowerCase().includes(query) || !!food.english_name?.toLowerCase().includes(query))
    .sort((a, b) => {
      const aSelected = isSelected(a);
      const bSelected = isSelected(b);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      
      return a.name.localeCompare(b.name);
    });

  const renderItem = ({ item }: { item: FoodResponse }) => {
    const selected = isSelected(item);
    const toggle = () => {
      if (!selected) {
        onToggleFood(item.name);
        return;
      }
      // Unticking removes the choice in whichever name it was saved.
      new Set([item.name, item.english_name]).forEach((name) => {
        if (name && selectedFoodNames.includes(name)) onToggleFood(name);
      });
    };
    return (
      <TouchableOpacity
        style={[styles.foodItem, selected && styles.foodItemSelected]}
        onPress={toggle}
      >
        <View style={styles.foodInfo}>
          <Text style={[styles.foodName, selected && styles.foodNameSelected]}>
            {item.name}
          </Text>
          <Text style={styles.foodMacros}>
            {t('components.foodList.macros', { kcal: item.kcal, protein: item.protein, carbs: item.carbs, fats: item.fats })}
          </Text>
        </View>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppTextInput
        label={t('components.foodList.searchLabel')}
        placeholder={t('components.foodList.searchPlaceholder')}
        value={searchQuery}
        onChangeText={setSearchQuery}
        clearable
      />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredFoods}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>{t('components.foodList.empty', { query: searchQuery })}</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: theme.spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  foodItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: `${theme.colors.primary}10`,
  },
  foodInfo: {
    flex: 1,
    gap: 4,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  foodNameSelected: {
    color: theme.colors.primary,
  },
  foodMacros: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.muted,
    marginTop: theme.spacing.xl,
  },
});
