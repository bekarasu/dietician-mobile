import React, { forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputInstance,
  TextInputProps,
  View,
} from 'react-native';

import { theme } from '../theme/theme';

interface AppTextInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export const AppTextInput = forwardRef<TextInputInstance, AppTextInputProps>(function AppTextInput(
  { label, error, style, ...props },
  forwardedRef,
) {
  const internalRef = React.useRef<TextInputInstance>(null);

  React.useImperativeHandle(forwardedRef, () => internalRef.current as TextInputInstance);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={internalRef}
        placeholderTextColor={theme.colors.muted}
        style={[styles.input, props.multiline ? styles.multiline : undefined, style]}
        {...props}
        onChangeText={(text) => {
          if (isNumeric(props)) {
            // The decimal keyboard shows a comma in locales like Turkish.
            const numericText = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
            if (numericText !== text) {
              internalRef.current?.setNativeProps({ text: numericText });
            }
            props.onChangeText?.(numericText);
          } else {
            props.onChangeText?.(text);
          }
        }}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

function isNumeric(props: TextInputProps) {
  return (
    props.keyboardType === 'numeric' ||
    props.keyboardType === 'number-pad' ||
    props.keyboardType === 'decimal-pad' ||
    props.inputMode === 'numeric' ||
    props.inputMode === 'decimal'
  );
}

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