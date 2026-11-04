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
  // A unit shown inside the field, after the value, such as "kg".
  suffix?: string;
}

export const AppTextInput = forwardRef<TextInputInstance, AppTextInputProps>(function AppTextInput(
  { label, error, suffix, style, ...props },
  forwardedRef,
) {
  const internalRef = React.useRef<TextInputInstance>(null);

  React.useImperativeHandle(forwardedRef, () => internalRef.current as TextInputInstance);

  const input = (
    <TextInput
      ref={internalRef}
      placeholderTextColor={theme.colors.muted}
      style={[styles.input, props.multiline ? styles.multiline : undefined, suffix ? styles.inputWithSuffix : undefined, style]}
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
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {suffix ? (
        <View style={[styles.suffixBox, error ? styles.suffixBoxError : undefined]}>
          {input}
          <Text style={styles.suffix}>{suffix}</Text>
        </View>
      ) : (
        input
      )}
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
  suffixBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    paddingRight: theme.spacing.md,
  },
  suffixBoxError: {
    borderColor: theme.colors.danger,
  },
  inputWithSuffix: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontSize: 20,
    fontWeight: '700',
  },
  suffix: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
  error: {
    color: theme.colors.danger,
    fontSize: theme.typography.caption.fontSize,
  },
});