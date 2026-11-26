import { Camera, Map, type LngLat, type StyleSpecification } from '@maplibre/maplibre-react-native';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components';
import { geoReverse } from '@/lib/geo';
import { useTripDraft } from '@/store/tripDraft';
import { theme } from '@/theme/theme';
import vyroDark from '../../assets/map/vyro-dark.json';

const SANTA_CRUZ: LngLat = [-63.1821, -17.7833];

export default function FijarDestino() {
  const insets = useSafeAreaInsets();
  const origin = useTripDraft((s) => s.origin);
  const setDestination = useTripDraft((s) => s.setDestination);
  const [start] = useState<LngLat>(origin ? [origin.lng, origin.lat] : SANTA_CRUZ);
  const center = useRef<LngLat | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    const [lng, lat] = center.current ?? start;
    setBusy(true);
    let name = 'Punto en el mapa';
    let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const r = await geoReverse(lat, lng);
      name = r.name || name;
      address = r.address || address;
    } catch {
      // Sin nombre: se usa el punto con coordenadas.
    }
    setDestination({ name, address, lat, lng });
    router.dismissTo('/');
  };

  return (
    <View style={styles.container}>
      <Map
        style={styles.map}
        mapStyle={vyroDark as StyleSpecification}
        touchPitch={false}
        compass={false}
        logo={false}
        attributionPosition={{ top: insets.top + theme.spacing.xs, left: theme.spacing.xs }}
        onRegionDidChange={(e) => {
          center.current = e.nativeEvent.center as LngLat;
        }}
      >
        <Camera initialViewState={{ center: start, zoom: origin ? 16 : 14 }} />
      </Map>
      <View accessible accessibilityLabel="Destino en el centro del mapa" pointerEvents="none" style={styles.pin} />
      <View style={[styles.bottom, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        <Button label="Confirmar destino" onPress={confirm} loading={busy} />
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
  },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: theme.size.screenPadding, gap: theme.spacing.xs },
});
