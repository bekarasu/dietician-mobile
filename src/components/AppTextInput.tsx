import { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { theme } from '../theme/theme';

interface AppTextInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(function AppTextInput(
  { label, error, style, ...props },
  ref,
) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.muted}
        style={[styles.input, props.multiline ? styles.multiline : undefined, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '700',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.caption.fontSize,
  },
});