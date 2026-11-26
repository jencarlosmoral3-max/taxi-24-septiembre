import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { formatMoney } from '@/lib/money';
import { theme } from '@/theme/theme';

import { Button } from './Button';
import { Chip } from './Chip';
import { Text } from './Text';

const COUNTER_BS = [1, 2, 5] as const;
const secondsLeft = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

type Props = {
  origin: string;
  destination: string;
  distanceKm: number;
  offeredCents: number;
  expiresAt: number; // ms epoch; el card cuenta hacia atras y llama onExpire una sola vez
  onAccept: () => void;
  onCounter: (totalCents: number) => void; // monto total ofertado (oferta + chip elegido)
  onIgnore: () => void;
  onExpire?: () => void;
};

export function RequestCard(p: Props) {
  const { expiresAt, onExpire } = p;
  const [left, setLeft] = useState(() => secondsLeft(expiresAt));
  const [extraBs, setExtraBs] = useState<number | null>(null);
  const deadlineRef = useRef(expiresAt);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    deadlineRef.current = expiresAt;
    firedRef.current = false;
  }, [expiresAt]);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const tick = () => {
      const l = secondsLeft(deadlineRef.current);
      setLeft(l);
      if (l <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    };
    const id = setInterval(tick, 250);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && tick());
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);

  const expired = left <= 0;
  const totalCents = p.offeredCents + (extraBs ?? 0) * 100;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text variant="body14" muted>
          {p.distanceKm.toFixed(1).replace('.', ',')} km
        </Text>
        <View style={styles.timer} accessible accessibilityLabel={`Expira en ${left} segundos`}>
          {left <= 5 && !expired && (
            <MaterialCommunityIcons name="circle" size={theme.size.dot} color={theme.colors.danger} />
          )}
          <Text variant="body14Medium">{left} s</Text>
        </View>
      </View>
      <View style={styles.place}>
        <MaterialCommunityIcons name="circle-medium" size={theme.size.icon} color={theme.colors.primary} />
        <Text variant="body16Medium" style={styles.flex}>
          {p.origin}
        </Text>
      </View>
      <View style={styles.place}>
        <MaterialCommunityIcons name="map-marker" size={theme.size.icon} color={theme.colors.success} />
        <Text variant="body16" style={styles.flex}>
          {p.destination}
        </Text>
      </View>
      <View style={styles.chips}>
        {COUNTER_BS.map((n) => (
          <Chip
            key={n}
            neutral
            label={`+${n} Bs`}
            accessibilityLabel={`Contraofertar ${formatMoney((p.offeredCents + n * 100))}`}
            selected={extraBs === n}
            disabled={expired}
            onPress={() => setExtraBs(extraBs === n ? null : n)}
          />
        ))}
      </View>
      <Button
        label={extraBs === null ? `Aceptar ${formatMoney(p.offeredCents)}` : `Ofertar ${formatMoney(totalCents)}`}
        disabled={expired}
        onPress={() => (extraBs === null ? p.onAccept() : p.onCounter(totalCents))}
      />
      <Button label="Ignorar" variant="secondary" onPress={p.onIgnore} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.card, padding: theme.spacing.md, gap: theme.spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  place: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  flex: { flex: 1 },
});
