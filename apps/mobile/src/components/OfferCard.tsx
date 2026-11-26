import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { formatMoney } from '@/lib/money';
import { theme } from '@/theme/theme';

import { Button } from './Button';
import { RatingStars } from './RatingStars';
import { Text } from './Text';

type Props = {
  driverName: string;
  rating: number;
  carModel: string;
  carColor: string;
  plate: string;
  unionNumber: string; // "Nº interno" del sindicato
  etaMin: number;
  priceCents: number;
  onAccept: () => void;
  onReject: () => void;
};

export function OfferCard(p: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="title18" numberOfLines={1}>
            {p.driverName}
          </Text>
          <View style={styles.rating}>
            <RatingStars value={p.rating} />
            <Text variant="body14" muted>
              {p.rating.toFixed(1).replace('.', ',')}
            </Text>
          </View>
        </View>
        <Text variant="amount32">{formatMoney(p.priceCents)}</Text>
      </View>
      <View style={styles.car}>
        <MaterialCommunityIcons name="car" size={20} color={theme.colors.textMuted} />
        <Text variant="body14" muted style={styles.flex} numberOfLines={2}>
          {p.carModel} · {p.carColor} · {p.plate}
        </Text>
      </View>
      <View style={styles.row}>
        <Text variant="body14" muted>
          Nº interno {p.unionNumber}
        </Text>
        <Text variant="body14Medium">{p.etaMin} min</Text>
      </View>
      <View style={styles.actions}>
        <Button label="Rechazar" variant="secondary" onPress={p.onReject} style={styles.flex} />
        <Button label="Aceptar" onPress={p.onAccept} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.card, padding: theme.spacing.md, gap: theme.spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  rating: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  car: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  flex: { flex: 1 },
});
