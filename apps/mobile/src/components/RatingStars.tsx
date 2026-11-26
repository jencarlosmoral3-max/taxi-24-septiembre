import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme/theme';

type Props = {
  value: number; // 0-5
  onChange?: (v: number) => void; // con onChange es input (estrellas de 48 px); sin el, solo muestra
  size?: number; // solo en modo display
};

export function RatingStars({ value, onChange, size = 16 }: Props) {
  const stars = [1, 2, 3, 4, 5];
  if (!onChange) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Calificación ${value.toFixed(1).replace('.', ',')} de 5`}
      >
        {stars.map((n) => (
          <MaterialCommunityIcons
            key={n}
            name={n <= Math.round(value) ? 'star' : 'star-outline'}
            size={size}
            color={theme.colors.primary}
          />
        ))}
      </View>
    );
  }
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel="Calificación">
      {stars.map((n) => (
        <Pressable
          key={n}
          accessibilityRole="radio"
          accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
          accessibilityState={{ selected: n === value }}
          onPress={() => onChange(n)}
          style={({ pressed }) => [styles.hit, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons name={n <= value ? 'star' : 'star-outline'} size={36} color={theme.colors.primary} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  hit: { width: theme.size.touchMin, height: theme.size.touchMin, alignItems: 'center', justifyContent: 'center' },
});
