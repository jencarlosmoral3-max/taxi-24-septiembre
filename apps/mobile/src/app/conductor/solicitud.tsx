import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet, Button, Chip, MoneyField, Text } from '@/components';
import { Countdown, useCountdown } from '@/components/driver/Countdown';
import { OFFER_TTL_MS } from '@/demo/data';
import { useDemoDriver } from '@/demo/useDemoDriver';
import { useBackConfirm, useDriverPhaseGuard } from '@/lib/driverFlow';
import { formatMoney } from '@/lib/money';
import { theme } from '@/theme/theme';

const COUNTER_BS = [1, 2, 5] as const;

export default function Solicitud() {
  const insets = useSafeAreaInsets();
  const ok = useDriverPhaseGuard(['incoming']);
  const request = useDemoDriver((s) => s.request);
  const offer = useDemoDriver((s) => s.offer);
  const ignore = useDemoDriver((s) => s.ignore);
  const [extraBs, setExtraBs] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [custom, setCustom] = useState<number | null>(null);
  const [customError, setCustomError] = useState<string>();
  const left = useCountdown(OFFER_TTL_MS, () => useDemoDriver.getState().phase === 'incoming' && ignore());
  useBackConfirm('¿Ignorar esta solicitud?', 'Dejarás de ver este pedido.', 'Ignorar', ignore);
  if (!ok || !request) return null;

  const fare = request.offered_fare_cents;
  const total = fare + (extraBs ?? 0) * 100;
  const expired = left <= 0;
  const sendCustom = () => {
    if (!custom || custom < fare) return setCustomError(`La contraoferta debe ser de ${formatMoney(fare)} o más`);
    setSheet(false);
    offer(custom);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom + theme.spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.row}>
          <Text variant="title20" accessibilityRole="header">
            Nuevo pedido
          </Text>
          <View style={styles.timer} accessible={false}>
            <MaterialCommunityIcons name="timer-outline" size={theme.size.icon} color={left <= 5 ? theme.colors.danger : theme.colors.textMuted} />
            <Countdown left={left} color={left <= 5 ? theme.colors.danger : undefined} />
          </View>
        </View>
        <View style={styles.card}>
          <Text variant="body16Medium" color={theme.colors.primary}>
            A {request.distanceKm.toFixed(1).replace('.', ',')} km de ti
          </Text>
          <View style={styles.place}>
            <MaterialCommunityIcons name="circle-medium" size={theme.size.icon} color={theme.colors.primary} />
            <Text variant="title18" style={styles.flex}>
              {request.origin_text}
            </Text>
          </View>
          <View style={styles.place}>
            <MaterialCommunityIcons name="map-marker" size={theme.size.icon} color={theme.colors.success} />
            <Text variant="title18" style={styles.flex}>
              {request.destination_text}
            </Text>
          </View>
          <View style={styles.fare}>
            <Text variant="body14" muted>
              El pasajero ofrece
            </Text>
            <Text variant="amount32">{formatMoney(fare)}</Text>
          </View>
        </View>

        <Text variant="body14Medium" muted>
          O contraoferta
        </Text>
        <View style={styles.chips}>
          {COUNTER_BS.map((n) => (
            <Chip
              key={n}
              neutral
              label={`+${n} Bs`}
              accessibilityLabel={`Contraofertar ${formatMoney(fare + n * 100)}`}
              selected={extraBs === n}
              disabled={expired}
              onPress={() => setExtraBs(extraBs === n ? null : n)}
            />
          ))}
          <Chip
            neutral
            label="Otro monto"
            disabled={expired}
            onPress={() => {
              setCustom(total);
              setCustomError(undefined);
              setSheet(true);
            }}
          />
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          label={extraBs === null ? `Aceptar ${formatMoney(fare)}` : `Ofertar ${formatMoney(total)}`}
          disabled={expired}
          onPress={() => offer(total)}
        />
        <Button label="Ignorar" variant="secondary" onPress={ignore} />
      </View>

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Tu oferta">
        <MoneyField
          label="Monto en Bs"
          valueCents={custom}
          onChangeCents={(c) => {
            setCustom(c);
            setCustomError(undefined);
          }}
          error={customError}
        />
        <Button label="Enviar oferta" disabled={expired} onPress={sendCustom} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.size.screenPadding, gap: theme.spacing.sm },
  scroll: { gap: theme.spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing['2xs'] },
  card: { gap: theme.spacing.md, padding: theme.spacing.lg, borderRadius: theme.radii.card, backgroundColor: theme.colors.surface },
  place: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  flex: { flex: 1 },
  fare: { gap: theme.spacing['2xs'], paddingTop: theme.spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  actions: { gap: theme.spacing.xs },
});
