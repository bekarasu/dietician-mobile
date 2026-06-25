import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { theme } from '../theme/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: AppButtonProps) {
  const variantStyle = buttonVariantStyles[variant];
  const textStyle = textVariantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyle,
        pressed && !disabled && !loading ? styles.pressed : undefined,
        (disabled || loading) ? styles.disabled : undefined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.surface : theme.colors.primary} />
      ) : (
        <Text style={[styles.text, textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: theme.radii.round,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.55,
  },
});

const buttonVariantStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondarySurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
});

const textVariantStyles = StyleSheet.create({
  primary: {
    color: theme.colors.surface,
  },
  secondary: {
    color: theme.colors.text,
  },
  ghost: {
    color: theme.colors.primary,
  },
});