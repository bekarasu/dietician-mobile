import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Country, deviceCountryCode, findCountry, searchCountries } from '../constants/countries';
import { theme } from '../theme/theme';

interface CountryPickerProps {
  // An ISO 3166-1 alpha-2 code, or '' for none yet.
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// The chosen country in a row like FoodPickerRow, opening a searchable list.
export function CountryPicker({ value, onChange, placeholder = 'Choose where you live', disabled = false }: CountryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = findCountry(value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selected ? `Country, ${selected.name}` : placeholder}
        disabled={disabled}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
      >
        <Ionicons name="location-outline" size={18} color={selected ? theme.colors.primary : theme.colors.muted} />
        <Text style={selected ? styles.value : styles.placeholder} numberOfLines={1}>
          {selected?.name ?? placeholder}
        </Text>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      </Pressable>
      <Modal
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
        onRequestClose={() => setIsOpen(false)}
        visible={isOpen}
      >
        {/* The Modal is a separate native window and needs its own insets. */}
        <SafeAreaProvider>
          <CountryList
            selectedCode={selected?.code}
            onClose={() => setIsOpen(false)}
            onSelect={(code) => {
              setIsOpen(false);
              if (code !== selected?.code) {
                onChange(code);
              }
            }}
          />
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

interface CountryListProps {
  selectedCode?: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

function CountryList({ selectedCode, onSelect, onClose }: CountryListProps) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchCountries(query), [query]);

  // Before searching, the chosen country and the phone's region come first.
  const pinned = useMemo(() => {
    const codes = [selectedCode, deviceCountryCode()].filter((code, index, all): code is string => Boolean(code) && all.indexOf(code) === index);
    return codes.map((code) => findCountry(code)).filter((country): country is Country => Boolean(country));
  }, [selectedCode]);
  const showPinned = !query.trim() && pinned.length > 0;

  const renderCountry = (country: Country) => {
    const isSelected = country.code === selectedCode;
    return (
      <Pressable
        key={country.code}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
        onPress={() => onSelect(country.code)}
        style={({ pressed }) => [styles.item, isSelected && styles.itemSelected, pressed && styles.pressed]}
      >
        <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>{country.name}</Text>
        {isSelected ? <Ionicons name="checkmark" size={20} color={theme.colors.primary} /> : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.sheet} edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Where do you live?</Text>
        <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={theme.spacing.sm} onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </Pressable>
      </View>
      <Text style={styles.caption}>Your meals use ingredients you can buy there. Plans stay in English.</Text>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={theme.colors.muted} />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder="Search countries"
          placeholderTextColor={theme.colors.muted}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
      </View>
      <FlatList
        data={results}
        keyExtractor={(country) => country.code}
        renderItem={({ item }) => renderCountry(item)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.list}
        initialNumToRender={20}
        ListHeaderComponent={
          showPinned ? (
            <View style={styles.pinned}>
              {pinned.map(renderCountry)}
              <Text style={styles.sectionLabel}>All countries</Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={<Text style={styles.empty}>No country matches "{query.trim()}".</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  value: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
  placeholder: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: theme.typography.body.fontSize,
  },
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.title.fontSize,
    fontWeight: '800',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  caption: {
    color: theme.colors.muted,
    lineHeight: 20,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    paddingVertical: theme.spacing.sm,
  },
  list: {
    paddingBottom: theme.spacing.xl,
  },
  pinned: {
    gap: 2,
  },
  sectionLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.lg,
  },
  itemSelected: {
    backgroundColor: theme.colors.primarySoft,
  },
  itemText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
  },
  itemTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  empty: {
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
  },
});
