import { Camera, type LngLat } from '@maplibre/maplibre-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text, VyroMap } from '@/components';
import { geoReverse, SERVICE_BBOX } from '@/lib/geo';
import { useTripDraft, type SavedKind } from '@/store/tripDraft';
import { theme } from '@/theme/theme';

const SANTA_CRUZ: LngLat = [-63.1821, -17.7833];
const REVERSE_TIMEOUT_MS = 4000;

export default function FijarDestino() {
  const insets = useSafeAreaInsets();
  const origin = useTripDraft((s) => s.origin);
  const setDestination = useTripDraft((s) => s.setDestination);
  const savePlace = useTripDraft((s) => s.savePlace);
  // ?guardar=home|work: modo "guardar lugar" (no cambia el destino, vuelve a la busqueda).
  const { guardar } = useLocalSearchParams<{ guardar?: SavedKind }>();
  const saveKind = guardar === 'home' || guardar === 'work' ? guardar : null;
  const saveLabel = saveKind === 'home' ? 'casa' : 'trabajo';
  const [start] = useState<LngLat>(origin ? [origin.lng, origin.lat] : SANTA_CRUZ);
  const center = useRef<LngLat | null>(null);
  const [busy, setBusy] = useState(false);
  const [outside, setOutside] = useState(false);

  const confirm = async () => {
    const [lng, lat] = center.current ?? start;
    const b = SERVICE_BBOX;
    if (lng < b.minLng || lng > b.maxLng || lat < b.minLat || lat > b.maxLat) {
      setOutside(true);
      return;
    }
    setOutside(false);
    setBusy(true);
    let name = 'Punto en el mapa';
    let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const r = await Promise.race([geoReverse(lat, lng), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), REVERSE_TIMEOUT_MS))]);
      name = r.name || name;
      address = r.address || address;
    } catch {
      // Sin nombre: se usa el punto con coordenadas.
    }
    if (saveKind) {
      savePlace(saveKind, { name: saveKind === 'home' ? 'Casa' : 'Trabajo', address, lat, lng });
      router.back();
      return;
    }
    setDestination({ name, address, lat, lng });
    router.dismissTo('/');
  };

  return (
    <View style={styles.container}>
      <VyroMap
        style={styles.map}
        onRegionDidChange={(e) => {
          center.current = e.nativeEvent.center as LngLat;
        }}
      >
        <Camera initialViewState={{ center: start, zoom: origin ? 16 : 14 }} />
      </VyroMap>
      <View pointerEvents="none" style={[styles.hint, { top: insets.top + theme.spacing.xs }]}>
        <View style={styles.chip}>
          <Text variant="body14">{saveKind ? `Mueve el mapa hasta tu ${saveLabel}` : 'Mueve el mapa hasta el punto de destino'}</Text>
        </View>
      </View>
      <View accessible accessibilityLabel="Destino en el centro del mapa" pointerEvents="none" style={styles.pin} />
      <View style={[styles.bottom, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        {outside && (
          <Text color={theme.colors.danger} accessibilityLiveRegion="polite">
            Ese punto está fuera del área de servicio (Santa Cruz).
          </Text>
        )}
        <Button label={saveKind ? `Guardar ${saveLabel}` : 'Confirmar destino'} onPress={confirm} loading={busy} />
        <Button label="Volver" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const PIN = theme.size.dot * 2;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  map: { flex: 1 },
  pin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: PIN,
    height: PIN,
    marginTop: -PIN / 2,
    marginLeft: -PIN / 2,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.text,
    shadowColor: theme.colors.bg,
    shadowOpacity: 1,
    shadowRadius: theme.spacing['2xs'],
    elevation: theme.spacing.xs,
  },
  hint: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: theme.size.screenPadding },
  chip: { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.xs, borderRadius: theme.radii.pill, backgroundColor: theme.colors.surface },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: theme.size.screenPadding, gap: theme.spacing.xs },
});
