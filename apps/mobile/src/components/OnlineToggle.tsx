import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme/theme';

import { Text } from './Text';

type Props = { online: boolean; onToggle: (next: boolean) => void; disabled?: boolean };

export function OnlineToggle({ online, onToggle, disabled }: Props) {
  const label = online ? 'En línea' : 'Fuera de línea';
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="Disponible para viajes"
      accessibilityState={{ checked: online, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onToggle(!online)}
      style={({ pressed }) => [
        styles.base,
        online ? styles.on : styles.off,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: online ? theme.colors.text : theme.colors.textMuted }]} />
      <Text variant="title20" maxFontSizeMultiplier={1.3}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: theme.size.toggleHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    borderRadius: theme.radii.pill,
    paddingHorizontal: theme.spacing.xl,
  },
  on: { backgroundColor: theme.colors.successStrong },
  off: { backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border },
  dot: { width: theme.size.dot, height: theme.size.dot, borderRadius: theme.size.dot / 2 },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.4 },
});
