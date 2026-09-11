import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppTextInput } from './AppTextInput';
import { recommendationService } from '../services/recommendationService';
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

  const filteredFoods = foods
    .filter((food) => food.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aSelected = selectedFoodNames.includes(a.name);
      const bSelected = selectedFoodNames.includes(b.name);
      
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      
      return a.name.localeCompare(b.name);
    });

  const renderItem = ({ item }: { item: FoodResponse }) => {
    const isSelected = selectedFoodNames.includes(item.name);
    return (
      <TouchableOpacity
        style={[styles.foodItem, isSelected && styles.foodItemSelected]}
        onPress={() => onToggleFood(item.name)}
      >
        <View style={styles.foodInfo}>
          <Text style={[styles.foodName, isSelected && styles.foodNameSelected]}>
            {item.name}
          </Text>
          <Text style={styles.foodMacros}>
            {item.kcal} kcal | P: {item.protein}g | C: {item.carbs}g | F: {item.fats}g
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <AppTextInput
        label="Search Foods"
        placeholder="e.g. Apple, Chicken Breast..."
        value={searchQuery}
        onChangeText={setSearchQuery}
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
            <Text style={styles.emptyText}>No foods found matching "{searchQuery}"</Text>
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
