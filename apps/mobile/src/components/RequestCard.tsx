import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatMoney } from '@/lib/money';
import { theme } from '@/theme/theme';

import { Button } from './Button';
import { Chip } from './Chip';
import { Text } from './Text';

const COUNTER_BS = [1, 2, 5] as const;

type Props = {
  origin: string;
  destination: string;
  distanceKm: number;
  offeredCents: number;
  expiresInSeconds: number; // el card cuenta hacia atras y llama onExpire en 0
  onAccept: () => void;
  onCounter: (cents: number) => void; // un toque en el chip envia la contraoferta (uso en marcha)
  onIgnore: () => void;
  onExpire?: () => void;
};

export function RequestCard(p: Props) {
  const [left, setLeft] = useState(p.expiresInSeconds);
  const { onExpire } = p;
  useEffect(() => {
    if (left <= 0) {
      onExpire?.();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onExpire]);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text variant="body14" muted>
          {p.distanceKm.toFixed(1).replace('.', ',')} km
        </Text>
        <Text
          variant="body14Medium"
          color={left <= 5 ? theme.colors.danger : theme.colors.textMuted}
          accessibilityLabel={`Expira en ${left} segundos`}
        >
          {left} s
        </Text>
      </View>
      <View style={styles.place}>
        <MaterialCommunityIcons name="circle-medium" size={20} color={theme.colors.primary} />
        <Text variant="body16Medium" style={styles.flex} numberOfLines={2}>
          {p.origin}
        </Text>
      </View>
      <View style={styles.place}>
        <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.success} />
        <Text variant="body16" style={styles.flex} numberOfLines={2}>
          {p.destination}
        </Text>
      </View>
      <Button label={`Aceptar ${formatMoney(p.offeredCents)}`} onPress={p.onAccept} disabled={left <= 0} />
      <View style={styles.chips}>
        {COUNTER_BS.map((n) => (
          <Chip
            key={n}
            label={`+${n} Bs`}
            disabled={left <= 0}
            onPress={() => p.onCounter(p.offeredCents + n * 100)}
          />
        ))}
      </View>
      <Button label="Ignorar" variant="secondary" onPress={p.onIgnore} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.card, padding: theme.spacing.md, gap: theme.spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  place: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  chips: { flexDirection: 'row', gap: theme.spacing.xs },
  flex: { flex: 1 },
});
