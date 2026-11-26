import { Camera, type CameraRef, Map, Marker, type LngLat } from '@maplibre/maplibre-react-native';
import { Link } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { signOut } from '@/lib/googleSignIn';
import { theme } from '@/theme/theme';

const SANTA_CRUZ: LngLat = [-63.1821, -17.7833];
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

type Perm = 'loading' | 'ask' | 'granted' | 'denied';

export default function Index() {
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraRef>(null);
  const centered = useRef(false);
  const dismissed = useRef(false);
  const [perm, setPerm] = useState<Perm>('loading');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [fix, setFix] = useState<LngLat | null>(null);
  const [servicesOff, setServicesOff] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [mapError, setMapError] = useState(false);

  const apply = useCallback((p: Location.LocationPermissionResponse) => {
    setCanAskAgain(p.canAskAgain);
    setPerm(p.granted ? 'granted' : p.canAskAgain && p.status === 'undetermined' && !dismissed.current ? 'ask' : 'denied');
  }, []);

  // Al volver de Ajustes se relee el permiso; nunca se pide aqui.
  const check = useCallback(() => {
    Location.hasServicesEnabledAsync().then((on) => setServicesOff(!on), () => {});
    return Location.getForegroundPermissionsAsync().then(apply, () => setPerm('denied'));
  }, [apply]);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [check]);

  useEffect(() => {
    if (perm !== 'granted' || servicesOff) return;
    let sub: Location.LocationSubscription | undefined;
    let gone = false;
    Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
      ({ coords }) => {
        const c: LngLat = [coords.longitude, coords.latitude];
        setFix(c);
        if (!centered.current) {
          centered.current = true;
          camera.current?.jumpTo({ center: c, zoom: 16 });
        }
      },
    ).then((s) => (gone ? s.remove() : (sub = s)), () => setServicesOff(true));
    return () => {
      gone = true;
      sub?.remove();
    };
  }, [perm, servicesOff]);

  const request = () => Location.requestForegroundPermissionsAsync().then(apply, () => setPerm('denied'));

  const pinMode = perm === 'denied' || (perm === 'granted' && servicesOff);
  return (
    <View style={styles.container}>
      <Map
        key={mapKey}
        style={styles.map}
        mapStyle={STYLE_URL}
        touchPitch={false}
        compass={false}
        logo={false}
        attributionPosition={{ top: insets.top + theme.spacing.xs, left: theme.spacing.xs }}
        onDidFinishLoadingMap={() => setMapError(false)}
        onDidFailLoadingMap={() => setMapError(true)}
      >
        <Camera ref={camera} initialViewState={{ center: fix ?? SANTA_CRUZ, zoom: fix ? 16 : 14 }} />
        {fix && (
          <Marker lngLat={fix}>
            <View style={styles.dot} />
          </Marker>
        )}
      </Map>

      {pinMode && <View pointerEvents="none" style={styles.pin} />}

      <View style={[styles.signOut, { top: insets.top + theme.spacing.xs }]}>
        <Button label="Cerrar sesión" variant="secondary" onPress={() => signOut()} />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        {__DEV__ && (
          <Link href="/dev-components" style={styles.link}>
            <Text variant="body14Medium" muted>
              Componentes (dev)
            </Text>
          </Link>
        )}
        {mapError ? (
          <Card
            title="No pudimos cargar el mapa"
            body="Revisa tu conexión a internet e inténtalo de nuevo."
          >
            <Button label="Reintentar" onPress={() => { setMapError(false); setMapKey((k) => k + 1); }} />
          </Card>
        ) : perm === 'ask' ? (
          <Card
            title="Usa tu ubicación"
            body="La necesitamos para mostrarte los taxis cercanos y fijar tu punto de recogida."
          >
            <Button label="Permitir ubicación" onPress={request} />
            <Button label="Ahora no" variant="secondary" onPress={() => { dismissed.current = true; setPerm('denied'); }} />
          </Card>
        ) : perm === 'granted' && servicesOff ? (
          <Card
            title="Activa la ubicación"
            body="Tu teléfono tiene la ubicación apagada. Actívala o mueve el mapa para fijar tu punto."
          >
            <Button
              label="Activar ubicación"
              onPress={() => Location.enableNetworkProviderAsync().then(check, () => {})}
            />
          </Card>
        ) : pinMode ? (
          <Card
            title="Fija tu punto en el mapa"
            body="Sin ubicación, mueve el mapa hasta que el punto quede donde quieres que te recojan."
          >
            {canAskAgain ? (
              <Button label="Permitir ubicación" onPress={request} />
            ) : (
              <Button label="Abrir ajustes" onPress={() => Linking.openSettings()} />
            )}
          </Card>
        ) : null}
      </View>
    </View>
  );
}

function Card({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text variant="title18">{title}</Text>
      <Text muted>{body}</Text>
      {children}
    </View>
  );
}

const PIN = theme.size.dot * 2;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  map: { flex: 1 },
  dot: {
    width: theme.size.icon,
    height: theme.size.icon,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.text,
  },
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
    borderColor: theme.colors.onPrimary,
  },
  signOut: { position: 'absolute', right: theme.size.screenPadding },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: theme.size.screenPadding, gap: theme.spacing.xs },
  link: { alignSelf: 'center', paddingVertical: theme.spacing.sm, minHeight: theme.size.touchMin },
  card: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
