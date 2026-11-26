import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { RideMap, useHardwareBack, useRideGuard, useRideOrigin } from '@/demo/passengerExtras';
import { useDemoRide } from '@/demo/useDemoRide';
import { useTripDraft } from '@/store/tripDraft';
import { theme } from '@/theme/theme';

const noop = () => {}; // atras desactivado durante el viaje

export default function EnCurso() {
  const insets = useSafeAreaInsets();
  const origin = useRideOrigin();
  const destination = useTripDraft((s) => s.destination);
  const { driver, completeRide } = useDemoRide();
  const ok = useRideGuard(['in_progress']);
  const [sos, setSos] = useState<'closed' | 'confirm' | 'sent'>('closed');
  useHardwareBack(sos === 'closed' ? noop : () => setSos('closed'));

  if (!ok || !driver) return null;
  const destName = destination?.name ?? 'Tu destino';
  const name = driver.profile.full_name ?? 'Conductor';
  const car = [driver.vehicle.brand, driver.vehicle.model].filter(Boolean).join(' ');

  return (
    <View style={styles.root}>
      <RideMap origin={origin} destination={destination ?? undefined} route />
      <View style={[styles.panel, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        <Text variant="title20" accessibilityRole="header">
          Viaje en curso
        </Text>
        <View accessible accessibilityLabel={`Destino: ${destName}`}>
          <Text variant="body14" muted>
            Destino
          </Text>
          <Text variant="body16Medium" numberOfLines={1}>
            {destName}
          </Text>
        </View>
        <View accessible accessibilityLabel={`Conductor ${name}, placa ${driver.vehicle.plate}`}>
          <Text variant="body16Medium">{name}</Text>
          <Text variant="body14" muted>
            {car} · {driver.vehicle.plate}
          </Text>
        </View>
        <Button label="SOS" variant="danger" accessibilityLabel="SOS, pedir ayuda" onPress={() => setSos('confirm')} />
        <Button label="Llegamos (demo)" variant="secondary" onPress={completeRide} />
      </View>

      <Modal visible={sos !== 'closed'} transparent animationType="fade" onRequestClose={() => setSos('closed')} statusBarTranslucent>
        <View style={styles.scrim}>
          <View style={styles.dialog} accessibilityViewIsModal>
            {sos === 'sent' ? (
              <>
                <Text variant="title20" accessibilityRole="header" accessibilityLiveRegion="polite">
                  Alerta enviada (demo)
                </Text>
                <Text muted>En la versión real se llamaría al 110 y se avisaría al sindicato.</Text>
                <Button label="Cerrar" variant="secondary" onPress={() => setSos('closed')} />
              </>
            ) : (
              <>
                <Text variant="title20" accessibilityRole="header">
                  ¿Pedir ayuda?
                </Text>
                <Text muted>Llamará al 110 y avisará al sindicato.</Text>
                <Button label="Enviar alerta" variant="danger" onPress={() => setSos('sent')} />
                <Button label="Cancelar" variant="secondary" onPress={() => setSos('closed')} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.size.screenPadding,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
  },
  scrim: { flex: 1, justifyContent: 'center', padding: theme.size.screenPadding, backgroundColor: theme.colors.scrim },
  dialog: { gap: theme.spacing.sm, padding: theme.spacing.lg, borderRadius: theme.radii.card, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
});
