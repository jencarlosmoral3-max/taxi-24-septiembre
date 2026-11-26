import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, Text } from '@/components';
import { DEMO_TODAY_TRIPS, DEMO_WEEK_PREVIOUS_DAYS, TODAY_BASE } from '@/demo/driverExtras';
import { useDemoDriver } from '@/demo/useDemoDriver';
import { formatMoney } from '@/lib/money';
import { theme } from '@/theme/theme';

type Range = 'today' | 'week';
const tripsLabel = (n: number) => `${n} ${n === 1 ? 'viaje' : 'viajes'}`;

export default function Ganancias() {
  const insets = useSafeAreaInsets();
  const earnings = useDemoDriver((s) => s.earnings);
  const [range, setRange] = useState<Range>('today');
  const total = earnings[range];
  // Viajes hechos en esta sesion demo (el store suma encima de la base).
  const extra = { cents: earnings.today.cents - TODAY_BASE.cents, trips: earnings.today.trips - TODAY_BASE.trips };

  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.spacing.xs }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.back}>
          <MaterialCommunityIcons name="arrow-left" size={theme.size.icon * 1.2} color={theme.colors.text} />
        </Pressable>
        <Text variant="title20" accessibilityRole="header">
          Ganancias
        </Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        <View style={styles.chips}>
          <Chip label="Hoy" selected={range === 'today'} onPress={() => setRange('today')} />
          <Chip label="Esta semana" selected={range === 'week'} onPress={() => setRange('week')} />
        </View>
        <View style={styles.total} accessible accessibilityLabel={`Total ${formatMoney(total.cents)}, ${tripsLabel(total.trips)}`}>
          <Text variant="amount32">{formatMoney(total.cents)}</Text>
          <Text muted>{tripsLabel(total.trips)}</Text>
        </View>

        <View style={styles.list}>
          {range === 'today' ? (
            <>
              {extra.trips > 0 && <Row title="Viajes de esta sesión" sub={tripsLabel(extra.trips)} cents={extra.cents} />}
              {[...DEMO_TODAY_TRIPS].reverse().map((t) => (
                <Row key={t.id} title={`${t.from} → ${t.to}`} sub={t.time} cents={t.cents} />
              ))}
            </>
          ) : (
            <>
              <Row title="Hoy" sub={tripsLabel(earnings.today.trips)} cents={earnings.today.cents} />
              {DEMO_WEEK_PREVIOUS_DAYS.map((d) => (
                <Row key={d.label} title={d.label} sub={tripsLabel(d.trips)} cents={d.cents} />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ title, sub, cents }: { title: string; sub: string; cents: number }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${title}, ${sub}, ${formatMoney(cents)}`}>
      <View style={styles.flex}>
        <Text variant="body16Medium" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="body14" muted>
          {sub}
        </Text>
      </View>
      <Text variant="amount20">{formatMoney(cents)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.xs },
  back: { width: theme.size.touchMin, height: theme.size.touchMin, alignItems: 'center', justifyContent: 'center' },
  content: { padding: theme.size.screenPadding, gap: theme.spacing.md },
  chips: { flexDirection: 'row', gap: theme.spacing.sm },
  total: { gap: theme.spacing['2xs'], padding: theme.spacing.lg, borderRadius: theme.radii.card, backgroundColor: theme.colors.surface },
  list: { gap: theme.spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.input,
    backgroundColor: theme.colors.surface2,
  },
  flex: { flex: 1 },
});
