import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { theme } from '@/theme/theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'pill';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const { colors } = theme;
const bg: Record<ButtonVariant, string> = {
  primary: colors.primary,
  secondary: colors.surface2,
  danger: colors.dangerStrong,
  success: colors.successStrong,
  pill: colors.surface2,
};
const fg: Record<ButtonVariant, string> = {
  primary: colors.onPrimary,
  secondary: colors.text,
  danger: colors.text,
  success: colors.text,
  pill: colors.text,
};

export function Button({ label, onPress, variant = 'primary', loading, disabled, accessibilityLabel, style }: Props) {
  const inactive = disabled || loading;
  const off = disabled && !loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'pill' ? styles.pill : styles.full,
        { backgroundColor: off ? colors.surface2 : bg[variant] },
        (variant === 'secondary' || off) && styles.bordered,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <Text variant="body16Medium" color={off ? colors.textMuted : fg[variant]} maxFontSizeMultiplier={1.3} style={styles.label}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.pill },
  full: { minHeight: theme.size.ctaHeight, paddingHorizontal: theme.spacing.xl },
  pill: { minHeight: theme.size.touchMin, paddingHorizontal: theme.spacing.lg, alignSelf: 'flex-start' },
  bordered: { borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.8 },
  label: { textAlign: 'center' },
});
