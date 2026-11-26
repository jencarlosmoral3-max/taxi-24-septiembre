import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { Countdown, useCountdown } from '@/components/driver/Countdown';
import { OFFER_TTL_MS } from '@/demo/data';
import { useDemoDriver } from '@/demo/useDemoDriver';
import { confirmAction, useBackConfirm, useDriverPhaseGuard } from '@/lib/driverFlow';
import { formatMoney } from '@/lib/money';
import { theme } from '@/theme/theme';

export default function Esperando() {
  const insets = useSafeAreaInsets();
  const ok = useDriverPhaseGuard(['waiting']);
  const offered = useDemoDriver((s) => s.offeredCents);
  const request = useDemoDriver((s) => s.request);
  const cancel = useDemoDriver((s) => s.cancel);
  const left = useCountdown(OFFER_TTL_MS, () => useDemoDriver.getState().phase === 'waiting' && cancel()); // la oferta vence sola
  const ask = () => confirmAction('¿Cancelar tu oferta?', 'El pasajero ya no la verá.', 'Cancelar oferta', cancel);
  useBackConfirm('¿Cancelar tu oferta?', 'El pasajero ya no la verá.', 'Cancelar oferta', cancel);
  if (!ok || offered === null) return null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.spacing['3xl'], paddingBottom: insets.bottom + theme.spacing.md }]}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text variant="title24" accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.text}>
          Esperando al pasajero
        </Text>
        <Text muted style={styles.text}>
          {request ? `${request.passenger.full_name} está viendo tu oferta.` : 'El pasajero está viendo tu oferta.'}
        </Text>
        <View style={styles.card}>
          <Text variant="body14" muted>
            Tu oferta
          </Text>
          <Text variant="amount32">{formatMoney(offered)}</Text>
          <View style={styles.timer}>
            <Text muted>Vence en </Text>
            <Countdown left={left} />
          </View>
        </View>
      </View>
      <Button label="Cancelar oferta" variant="secondary" onPress={ask} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.size.screenPadding },
  center: { flex: 1, alignItems: 'center', gap: theme.spacing.md },
  text: { textAlign: 'center' },
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: theme.spacing['2xs'],
    marginTop: theme.spacing.md,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
  },
  timer: { flexDirection: 'row', alignItems: 'center' },
});
