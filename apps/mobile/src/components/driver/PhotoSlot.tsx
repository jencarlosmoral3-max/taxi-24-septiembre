import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { theme } from '@/theme/theme';

// Demo: tocar alterna "Foto lista". En fase 2 abre la camara / galeria.
export function PhotoSlot({ label, ready, onToggle }: { label: string; ready: boolean; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: ready }}
      onPress={onToggle}
      style={({ pressed }) => [styles.slot, ready && styles.ready, pressed && styles.pressed]}
    >
      <MaterialCommunityIcons
        name={ready ? 'check-circle' : 'camera-outline'}
        size={theme.size.icon * 1.4}
        color={ready ? theme.colors.success : theme.colors.textMuted}
      />
      <View style={styles.flex}>
        <Text variant="body16Medium">{label}</Text>
        <Text variant="body14" color={ready ? theme.colors.success : theme.colors.textMuted}>
          {ready ? 'Foto lista' : 'Toca para agregar'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.size.ctaHeight + theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radii.input,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  ready: { borderStyle: 'solid', borderColor: theme.colors.success },
  pressed: { opacity: 0.8 },
  flex: { flex: 1 },
});
