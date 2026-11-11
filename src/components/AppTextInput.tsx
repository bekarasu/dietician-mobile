import { Ionicons } from '@expo/vector-icons';
import React, { forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputInstance,
  TextInputProps,
  View,
} from 'react-native';

import { t } from '../i18n';
import { theme } from '../theme/theme';

interface AppTextInputProps extends TextInputProps {
  label: string;
  error?: string;
  // A unit shown inside the field, after the value, such as "kg".
  suffix?: string;
  // Shows an (x) button inside the field while it has text, which empties it.
  clearable?: boolean;
}

export const AppTextInput = forwardRef<TextInputInstance, AppTextInputProps>(function AppTextInput(
  { label, error, suffix, clearable, style, ...props },
  forwardedRef,
) {
  const internalRef = React.useRef<TextInputInstance>(null);
  // Only used when the field is uncontrolled, so the clear button knows when to show.
  const [uncontrolledText, setUncontrolledText] = React.useState(props.defaultValue ?? '');
  const currentText = props.value ?? uncontrolledText;

  React.useImperativeHandle(forwardedRef, () => internalRef.current as TextInputInstance);

  const changeText = (text: string) => {
    if (props.value === undefined) {
      setUncontrolledText(text);
    }
    props.onChangeText?.(text);
  };

  // The box layout depends on the props only, never on the text, so the
  // TextInput is not remounted (and does not lose focus) when the button toggles.
  const boxed = Boolean(suffix || clearable);
  const showClearButton = clearable && props.editable !== false && currentText.length > 0;

  const input = (
    <TextInput
      ref={internalRef}
      placeholderTextColor={theme.colors.muted}
      style={[
        styles.input,
        props.multiline ? styles.multiline : undefined,
        boxed ? styles.inputInBox : undefined,
        suffix ? styles.inputWithSuffix : undefined,
        style,
      ]}
      {...props}
      onChangeText={(text) => {
        if (isNumeric(props)) {
          // The decimal keyboard shows a comma in locales like Turkish.
          const numericText = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
          if (numericText !== text) {
            internalRef.current?.setNativeProps({ text: numericText });
          }
          changeText(numericText);
        } else {
          changeText(text);
        }
      }}
    />
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {boxed ? (
        <View style={[styles.box, error ? styles.boxError : undefined]}>
          {input}
          {showClearButton ? (
            <Pressable
              accessibilityLabel={t('components.textInput.clear', { label })}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => {
                // clear() does not fire onChangeText, so report the empty text ourselves.
                internalRef.current?.clear();
                changeText('');
              }}
              style={[styles.clearButton, suffix ? styles.clearButtonBeforeSuffix : undefined]}
            >
              <Ionicons color={theme.colors.muted} name="close-circle" size={20} />
            </Pressable>
          ) : null}
          {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
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
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    paddingRight: theme.spacing.md,
  },
  boxError: {
    borderColor: theme.colors.danger,
  },
  inputInBox: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  inputWithSuffix: {
    fontSize: 20,
    fontWeight: '700',
  },
  clearButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonBeforeSuffix: {
    marginRight: theme.spacing.sm,
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