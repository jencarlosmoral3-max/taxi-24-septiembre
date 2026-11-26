import { Pressable, StyleSheet, View } from 'react-native';

import { Button, RatingStars, Text } from '@/components';
import { MapScreen } from '@/components/driver/MapScreen';
import { DEMO_PASSENGER_PHONE } from '@/demo/driverExtras';
import { useDemoDriver } from '@/demo/useDemoDriver';
import { confirmAction, openNavigation, openUrl, useBackConfirm, useDriverPhaseGuard } from '@/lib/driverFlow';
import { theme } from '@/theme/theme';

export default function Recoger() {
  const ok = useDriverPhaseGuard(['assigned', 'driver_arrived']);
  const phase = useDemoDriver((s) => s.phase);
  const request = useDemoDriver((s) => s.request);
  const arrived = useDemoDriver((s) => s.arrived);
  const start = useDemoDriver((s) => s.start);
  const cancel = useDemoDriver((s) => s.cancel);
  const ask = () => confirmAction('¿Cancelar el viaje?', 'El pasajero será avisado.', 'Cancelar viaje', cancel);
  useBackConfirm('Tienes un viaje asignado', '¿Quieres cancelarlo?', 'Cancelar viaje', cancel);
  if (!ok || !request) return null;

  const { pickup, passenger } = request;
  const here = phase === 'driver_arrived';
  return (
    <MapScreen
      center={[pickup.lng, pickup.lat]}
      zoom={15}
      pins={[{ lngLat: [pickup.lng, pickup.lat], kind: 'pickup', label: `Recogida: ${pickup.name}` }]}
    >
      <Text variant="body14Medium" muted accessibilityLiveRegion="polite">
        {here ? 'Avisamos al pasajero que llegaste' : 'Ve a recoger a'}
      </Text>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="title20">{passenger.full_name}</Text>
          <Text muted numberOfLines={1}>
            {pickup.name}
          </Text>
        </View>
        <View style={styles.rating}>
          <RatingStars value={passenger.rating_avg ?? 0} />
          <Text variant="body14" muted>
            {(passenger.rating_avg ?? 0).toFixed(1).replace('.', ',')}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <Button label="Navegar" variant="secondary" style={styles.flex} onPress={() => openNavigation(pickup.lat, pickup.lng)} />
        <Button label="Llamar" variant="secondary" style={styles.flex} onPress={() => openUrl(`tel:${DEMO_PASSENGER_PHONE}`)} />
      </View>
      {here ? <Button label="Iniciar viaje" onPress={start} /> : <Button label="Llegué" onPress={arrived} />}
      <Pressable accessibilityRole="button" onPress={ask} style={styles.cancel}>
        <Text variant="body16Medium" color={theme.colors.danger}>
          Cancelar viaje
        </Text>
      </Pressable>
    </MapScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  flex: { flex: 1 },
  rating: { alignItems: 'flex-end' },
  cancel: { minHeight: theme.size.touchMin, alignItems: 'center', justifyContent: 'center' },
});
