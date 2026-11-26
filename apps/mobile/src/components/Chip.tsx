import { Pressable, StyleSheet } from 'react-native';

import { theme } from '@/theme/theme';

import { Text } from './Text';

type Props = { label: string; selected?: boolean; onPress: () => void; disabled?: boolean; accessibilityLabel?: string; neutral?: boolean; role?: 'button' | 'radio' };

export function Chip({ label, selected = false, onPress, disabled, accessibilityLabel, neutral, role = 'button' }: Props) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={role === 'radio' ? { checked: selected, disabled: !!disabled } : { selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && (neutral ? styles.selectedNeutral : styles.selected),
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text variant="body14Medium" color={disabled ? theme.colors.textMuted : selected && !neutral ? theme.colors.onPrimary : theme.colors.text} maxFontSizeMultiplier={1.3}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: theme.size.touchMin,
    minWidth: theme.size.touchMin,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  selectedNeutral: { borderColor: theme.colors.text },
  pressed: { opacity: 0.8 },
  disabled: { backgroundColor: theme.colors.surface },
});
