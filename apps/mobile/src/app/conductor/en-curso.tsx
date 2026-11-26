import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Camera, Marker } from '@maplibre/maplibre-react-native';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button, Text } from '@/components';
import { MapScreen } from '@/components/driver/MapScreen';
import { useReduceMotion } from '@/demo/passengerExtras';
import { DEMO_MANEUVERS, DEMO_ROUTE, pointAt, ROUTE_CUM, ROUTE_METERS } from '@/demo/route';
import { useDemoDriver } from '@/demo/useDemoDriver';
import { confirmAction, openNavigation, useBackConfirm, useDriverPhaseGuard } from '@/lib/driverFlow';
import { theme } from '@/theme/theme';

const TRIP_MS = 75000; // demo: todo el recorrido dura ~75 s
const TICK_MS = 1000;
const STEP_M = (ROUTE_METERS * TICK_MS) / TRIP_MS;
const SPEED_M_MIN = 500; // ~30 km/h, para estimar los minutos restantes
const PITCH = 55;
const ZOOM = 17;

const fmtKm = (km: number) => km.toFixed(1).replace('.', ',');
const fmtDist = (m: number) => (m >= 1000 ? `${fmtKm(m / 1000)} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`);

export default function EnCurso() {
  const ok = useDriverPhaseGuard(['in_progress']);
  const request = useDemoDriver((s) => s.request);
  const finish = useDemoDriver((s) => s.finish);
  const [sos, setSos] = useState(false);
  const [done, setDone] = useState(0); // metros recorridos de la ruta demo
  const [eta] = useState(() => new Date(Date.now() + Math.ceil(ROUTE_METERS / SPEED_M_MIN) * 60000).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }));
  const reduce = useReduceMotion();
  const { height } = useWindowDimensions();
  useBackConfirm('Viaje en curso', 'Cuando llegues al destino, toca "Finalizar viaje".');

  // El taxi avanza solo mientras la pantalla esta enfocada; se limpia al salir o desmontar.
  useFocusEffect(
    useCallback(() => {
      const id = setInterval(() => setDone((d) => Math.min(d + STEP_M, ROUTE_METERS)), TICK_MS);
      return () => clearInterval(id);
    }, []),
  );
  if (!ok || !request) return null;

  const { dropoff } = request;
  const { pos, bearing, next } = pointAt(done);
  const arrived = done >= ROUTE_METERS;
  const step = DEMO_MANEUVERS.find((m) => ROUTE_CUM[m.at] > done) ?? DEMO_MANEUVERS[DEMO_MANEUVERS.length - 1];
  const leftM = ROUTE_METERS - done;
  const leftMin = Math.max(1, Math.ceil(leftM / SPEED_M_MIN));
  const askSos = () =>
    Alert.alert('¿Enviar alerta de emergencia?', 'Avisaremos al sindicato.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Enviar alerta', style: 'destructive', onPress: () => setSos(true) },
    ]);

  const banner = arrived ? 'Llegaste al destino' : `${step.text} en ${fmtDist(ROUTE_CUM[step.at] - done)}`;
  return (
    <MapScreen
      center={pos}
      zoom={ZOOM}
      pins={[{ lngLat: [dropoff.lng, dropoff.lat], kind: 'dropoff', label: `Destino: ${dropoff.name}` }]}
      route={[pos, ...DEMO_ROUTE.slice(next)]}
      camera={
        <Camera
          center={pos}
          zoom={ZOOM}
          pitch={PITCH}
          bearing={bearing}
          padding={{ bottom: height * 0.3 }}
          duration={reduce ? 0 : TICK_MS}
          easing="linear"
        />
      }
      mapChildren={
        <Marker lngLat={pos}>
          <View style={styles.car} accessible accessibilityLabel="Tu taxi">
            <MaterialCommunityIcons name="taxi" size={theme.size.icon} color={theme.colors.onPrimary} />
          </View>
        </Marker>
      }
      top={
        <View style={styles.banner} accessible accessibilityLiveRegion="polite" accessibilityLabel={`${banner}, ${step.street}`}>
          <MaterialCommunityIcons name={arrived ? 'flag-checkered' : step.icon} size={theme.size.starInput} color={theme.colors.primary} />
          <View style={styles.flex}>
            <Text variant="title18">{banner}</Text>
            <Text variant="body14" muted numberOfLines={1}>
              {arrived ? dropoff.name : step.street}
            </Text>
          </View>
        </View>
      }
    >
      <View style={styles.stats}>
        <Stat value={`${leftMin} min`} label="Restante" />
        <Stat value={`${fmtKm(leftM / 1000)} km`} label="Distancia" />
        <Stat value={eta} label="Llegada" />
      </View>
      <Text muted numberOfLines={1}>
        Destino: {dropoff.name}
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="amount20">{value}</Text>
      <Text variant="body14" muted>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  flex: { flex: 1 },
  sos: { padding: theme.spacing.sm, borderRadius: theme.radii.input, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.danger },
  banner: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
  },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  car: {
    width: theme.size.touchMin * 0.75,
    height: theme.size.touchMin * 0.75,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
