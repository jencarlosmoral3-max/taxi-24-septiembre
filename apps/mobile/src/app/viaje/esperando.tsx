import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, OfferCard, Text } from '@/components';
import { goToCancel, Pulse, RideMap, useHardwareBack, useNow, useRideGuard, useRideOrigin } from '@/demo/passengerExtras';
import { DEMO_DRIVERS } from '@/demo/data';
import { useDemoRide } from '@/demo/useDemoRide';
import { formatMoney } from '@/lib/money';
import { useTripDraft } from '@/store/tripDraft';
import { theme } from '@/theme/theme';

export default function Esperando() {
  const insets = useSafeAreaInsets();
  const origin = useRideOrigin();
  const destination = useTripDraft((s) => s.destination);
  const { fareCents, offers, raiseFare, requestRide, acceptOffer } = useDemoRide();
  const ok = useRideGuard(['requested']);
  const now = useNow();
  const [rejected, setRejected] = useState<string[]>([]);
  const [since, setSince] = useState(Date.now); // inicio de la busqueda actual
  useHardwareBack(goToCancel);

  if (!ok) return null;
  const visible = offers.filter((o) => !rejected.includes(o.id) && o.expiresAt > now);
  const empty = visible.length === 0 && now - since > 6000; // el store solo genera ofertas al pedir el viaje
  const status = visible.length
    ? `${visible.length} ${visible.length === 1 ? 'oferta' : 'ofertas'} para ti`
    : empty
      ? 'Sin ofertas por ahora. Sube la tarifa o cancela.'
      : 'Buscando conductores cercanos…';
  const raise = () => {
    const next = (fareCents ?? 0) + 100;
    if (empty) {
      // Sin ofertas vivas: pedir de nuevo con la tarifa mayor para que lleguen ofertas nuevas.
      requestRide(next);
      setRejected([]);
      setSince(Date.now());
    } else raiseFare(next);
  };

  return (
    <View style={styles.root}>
      <RideMap origin={origin} destination={destination ?? undefined} />
      <View style={[styles.panel, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        <View style={styles.head}>
          <Pulse />
          <View style={styles.flex}>
            <Text variant="title18" accessibilityRole="header" accessibilityLiveRegion="polite">
              {status}
            </Text>
            <Text variant="body14" muted>
              Tu tarifa: {fareCents === null ? '—' : formatMoney(fareCents)}
            </Text>
          </View>
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {visible.map((o) => {
            const d = DEMO_DRIVERS.find((x) => x.profile.id === o.driver_id);
            if (!d) return null;
            return (
              <View key={o.id} style={styles.offer}>
                <Text variant="body14" muted>
                  Expira en {Math.max(0, Math.ceil((o.expiresAt - now) / 1000))} s
                </Text>
                <OfferCard
                  driverName={d.profile.full_name ?? 'Conductor'}
                  rating={d.profile.rating_avg ?? 0}
                  carModel={`${d.vehicle.brand ?? ""} ${d.vehicle.model ?? ""}`.trim()}
                  carColor={d.vehicle.color ?? ""}
                  plate={d.vehicle.plate}
                  unionNumber={d.unionNumber}
                  etaMin={o.etaMin}
                  priceCents={o.price_cents}
                  onAccept={() => acceptOffer(o.id)}
                  onReject={() => setRejected((r) => [...r, o.id])}
                />
              </View>
            );
          })}
        </ScrollView>
        <View style={styles.actions}>
          <Button label="Cancelar" variant="secondary" onPress={goToCancel} style={styles.flex} />
          <Button label="Subir tarifa +1 Bs" accessibilityLabel="Subir tarifa un boliviano" onPress={raise} style={styles.flex} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  flex: { flex: 1 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '75%',
    padding: theme.size.screenPadding,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  list: { flexGrow: 0 },
  listContent: { gap: theme.spacing.sm },
  offer: { gap: theme.spacing['2xs'] },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
});
