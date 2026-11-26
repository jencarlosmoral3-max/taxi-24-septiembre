import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components';
import { MapScreen } from '@/components/driver/MapScreen';
import { useDemoDriver } from '@/demo/useDemoDriver';
import { confirmAction, openNavigation, useBackConfirm, useDriverPhaseGuard } from '@/lib/driverFlow';
import { theme } from '@/theme/theme';

export default function EnCurso() {
  const ok = useDriverPhaseGuard(['in_progress']);
  const request = useDemoDriver((s) => s.request);
  const finish = useDemoDriver((s) => s.finish);
  const [sos, setSos] = useState(false);
  useBackConfirm('Viaje en curso', 'Cuando llegues al destino, toca "Finalizar viaje".');
  if (!ok || !request) return null;

  const { pickup, dropoff } = request;
  const askSos = () =>
    Alert.alert('¿Enviar alerta de emergencia?', 'Avisaremos al sindicato.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Enviar alerta', style: 'destructive', onPress: () => setSos(true) },
    ]);
  return (
    <MapScreen
      center={[(pickup.lng + dropoff.lng) / 2, (pickup.lat + dropoff.lat) / 2]}
      zoom={13}
      pins={[
        { lngLat: [pickup.lng, pickup.lat], kind: 'pickup', label: `Origen: ${pickup.name}` },
        { lngLat: [dropoff.lng, dropoff.lat], kind: 'dropoff', label: `Destino: ${dropoff.name}` },
      ]}
    >
      <Text variant="body14Medium" muted>
        Destino
      </Text>
      <Text variant="title20">{dropoff.name}</Text>
      <Text muted numberOfLines={1}>
        {dropoff.address}
      </Text>
      {sos && (
        <View style={styles.sos} accessibilityLiveRegion="polite">
          <Text variant="body16Medium">Alerta enviada (demo)</Text>
          <Text variant="body14" muted>
            No se llamó a nadie. En la versión real se avisa al sindicato.
          </Text>
        </View>
      )}
      <View style={styles.row}>
        <Button label="Navegar" variant="secondary" style={styles.flex} onPress={() => openNavigation(dropoff.lat, dropoff.lng)} />
        <Button label="SOS" variant="danger" style={styles.flex} accessibilityLabel="SOS, enviar alerta de emergencia" onPress={askSos} />
      </View>
      <Button label="Finalizar viaje" onPress={() => confirmAction('¿Finalizar el viaje?', 'Pasarás a cobrar al pasajero.', 'Finalizar', finish)} />
    </MapScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  flex: { flex: 1 },
  sos: { padding: theme.spacing.sm, borderRadius: theme.radii.input, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.danger },
});
