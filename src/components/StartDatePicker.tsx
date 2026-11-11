import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { t } from '../i18n';
import { theme } from '../theme/theme';
import { addCalendarDays, formatMonthDay, formatWeekday, toCalendarDate } from '../utils/date';

// The backend accepts dates up to 14 days from today.
const DAYS_SHOWN = 14;

interface StartDatePickerProps {
  firstDate: string;
  value: string;
  onChange: (date: string) => void;
}

function getDayLabel(date: string, today: string) {
  if (date === today) {
    return t('format.today');
  }
  if (date === addCalendarDays(today, 1)) {
    return t('format.tomorrow');
  }
  return formatWeekday(date);
}

export function StartDatePicker({ firstDate, value, onChange }: StartDatePickerProps) {
  const today = toCalendarDate(new Date());
  const dates = Array.from({ length: DAYS_SHOWN }, (_, index) => addCalendarDays(firstDate, index));

  return (
    <ScrollView contentContainerStyle={styles.row} horizontal showsHorizontalScrollIndicator={false}>
      {dates.map((date) => {
        const selected = date === value;

        return (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(date)}
            style={[styles.option, selected ? styles.optionSelected : undefined]}
          >
            <Text style={[styles.dayLabel, selected ? styles.labelSelected : undefined]}>{getDayLabel(date, today)}</Text>
            <Text style={[styles.dateLabel, selected ? styles.labelSelected : undefined]}>{formatMonthDay(date)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.spacing.sm,
  },
  option: {
    minWidth: 84,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  optionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayLabel: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  dateLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.fontSize,
  },
  labelSelected: {
    color: theme.colors.surface,
  },
});
