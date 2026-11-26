import { Pressable, StyleSheet } from 'react-native';

import { theme } from '@/theme/theme';

import { Text } from './Text';

type Props = { label: string; selected?: boolean; onPress: () => void; disabled?: boolean };

export function Chip({ label, selected = false, onPress, disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text variant="body14Medium" color={selected ? theme.colors.onPrimary : theme.colors.text}>
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
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
});
