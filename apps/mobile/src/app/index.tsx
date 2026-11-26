import { Camera, type CameraRef, Marker, type LngLat } from '@maplibre/maplibre-react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Redirect, router } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text, VyroMap } from '@/components';
import { useOnboarding } from '@/store/onboarding';
import { useTripDraft } from '@/store/tripDraft';
import { useAppMode } from '@/store/appMode';
import { theme } from '@/theme/theme';

const SANTA_CRUZ: LngLat = [-63.1821, -17.7833];

type Perm = 'loading' | 'ask' | 'granted' | 'denied';

export default function Index() {
  const mode = useAppMode((s) => s.mode);
  if (mode === 'driver') return <Redirect href="/conductor" />;
  return <PassengerHome />;
}

function PassengerHome() {
  const insets = useSafeAreaInsets();
  const camera = useRef<CameraRef>(null);
  const centered = useRef(false);
  const [perm, setPerm] = useState<Perm>('loading');
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [fix, setFix] = useState<LngLat | null>(null);
  const [servicesOff, setServicesOff] = useState(false);
  const [noFix, setNoFix] = useState(false);
  const noFixRef = useRef(false);
  const dragged = useRef(false); // el usuario ya movio el pin en modo sin-fix
  const [mapKey, setMapKey] = useState(0);
  const [mapError, setMapError] = useState(false);
  const destination = useTripDraft((s) => s.destination);
  const origin = useTripDraft((s) => s.origin);
  const setOrigin = useTripDraft((s) => s.setOrigin);
  const lastCenter = useRef<LngLat | null>(null);
  const lastFixKey = useRef('');
  const setOriginAt = useCallback((lng: number, lat: number) => setOrigin({ name: 'Mi ubicación', address: '', lat, lng }), [setOrigin]);

  const apply = useCallback((p: Location.LocationPermissionResponse) => {
    setCanAskAgain(p.canAskAgain);
    setPerm(p.granted ? 'granted' : p.canAskAgain && p.status === 'undetermined' && !useOnboarding.getState().locationAsked ? 'ask' : 'denied');
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
        if (noFixRef.current) {
          if (dragged.current) return; // el usuario ya fija el punto a mano: no saltar
          noFixRef.current = false; // fix tardio sin intervencion del usuario: volver a la ubicacion real
          setNoFix(false);
        }
        const k = `${c[0].toFixed(4)},${c[1].toFixed(4)}`;
        if (k !== lastFixKey.current) {
          lastFixKey.current = k;
          setOriginAt(c[0], c[1]);
        }
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
  }, [perm, servicesOff, setOriginAt]);

  const request = () => Location.requestForegroundPermissionsAsync().then(apply, () => setPerm('denied'));

  // Sin fix GPS en 8 s (emulador, interior): pasar al modo pin para no dejar al usuario sin origen.
  useEffect(() => {
    if (perm !== 'granted' || servicesOff || fix) return;
    const t = setTimeout(() => {
      noFixRef.current = true;
      setNoFix(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [perm, servicesOff, fix]);

  const pinMode = perm === 'denied' || (perm === 'granted' && (servicesOff || noFix));
  useEffect(() => {
    if (!pinMode) return;
    lastFixKey.current = ''; // el origen pasa a ser el centro del mapa: el proximo fix GPS debe reaplicarse
    const c = lastCenter.current ?? SANTA_CRUZ;
    setOriginAt(c[0], c[1]);
  }, [pinMode, setOriginAt]);
  if (perm === 'loading') return <View style={styles.container} />; // evita montar el mapa y desmontarlo si sale la explicacion
  if (perm === 'ask') {
    return (
      <LocationPrePrompt
        onAllow={request}
        onSkip={() => {
          useOnboarding.getState().markLocationAsked();
          setPerm('denied');
        }}
      />
    );
  }
  return (
    <View style={styles.container}>
      <VyroMap
        key={mapKey}
        style={styles.map}
        onDidFinishLoadingMap={() => setMapError(false)}
        onDidFailLoadingMap={() => setMapError(true)}
        onRegionDidChange={(e) => {
          lastCenter.current = e.nativeEvent.center as LngLat;
          if (noFixRef.current && e.nativeEvent.userInteraction) dragged.current = true;
          if (pinMode) setOriginAt(e.nativeEvent.center[0], e.nativeEvent.center[1]);
        }}
      >
        <Camera ref={camera} initialViewState={{ center: fix ?? SANTA_CRUZ, zoom: fix ? 16 : 14 }} />
        {fix && !pinMode && (
          <Marker lngLat={fix}>
            <View style={styles.dot} accessibilityLabel="Tu ubicación" />
          </Marker>
        )}
      </VyroMap>

      {pinMode && <View accessible accessibilityLabel="Punto de recogida en el centro del mapa" pointerEvents="none" style={styles.pin} />}

      <View style={[styles.signOut, { top: insets.top + theme.spacing.xs }]}>
        <Button label="Perfil" variant="secondary" onPress={() => router.push('/perfil')} />
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
        ) : perm === 'granted' && noFix ? (
          <Card
            title="No encontramos tu ubicación"
            body="Mueve el mapa para fijar el punto de recogida."
          />
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
        {!mapError && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={destination ? `Destino: ${destination.name}. Cambiar` : '¿A dónde vas?'}
            accessibilityHint="Abre la búsqueda de destino"
            onPress={() => router.push('/destino')}
            style={styles.search}
          >
            <View style={styles.flex}>
              <Text variant="body16Medium" numberOfLines={1} muted={!destination}>
                {destination ? destination.name : '¿A dónde vas?'}
              </Text>
              {!!destination?.address && (
                <Text variant="body14" muted numberOfLines={1}>
                  {destination.address}
                </Text>
              )}
            </View>
            {destination && (
              <Text variant="body14Medium" color={theme.colors.primary}>
                Cambiar
              </Text>
            )}
          </Pressable>
        )}
        {origin && destination && !mapError && <Button label="Continuar" onPress={() => router.push('/viaje/tarifa')} />}
      </View>
    </View>
  );
}

// Explicacion previa al dialogo del sistema (solo con permiso sin decidir).
function LocationPrePrompt({ onAllow, onSkip }: { onAllow: () => void; onSkip: () => void }) {
  const insets = useSafeAreaInsets();
  const reasons = [
    { icon: 'map-marker' as const, text: 'Fijar tu punto de recogida donde estás.' },
    { icon: 'taxi' as const, text: 'Mostrarte los taxis cercanos.' },
  ];
  return (
    <View style={[styles.pre, { paddingTop: insets.top + theme.spacing['3xl'], paddingBottom: insets.bottom + theme.spacing.xl }]}>
      <View style={[styles.signOut, { top: insets.top + theme.spacing.xs }]}>
        <Button label="Perfil" variant="secondary" onPress={() => router.push('/perfil')} />
      </View>
      <View style={styles.preBody}>
        <View style={styles.preIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <MaterialCommunityIcons name="crosshairs-gps" size={theme.size.icon * 2} color={theme.colors.primary} />
        </View>
        <Text variant="title24" accessibilityRole="header">Activa tu ubicación</Text>
        <Text muted>La usamos solo mientras tienes la app abierta, para:</Text>
        {reasons.map((r) => (
          <View key={r.text} style={styles.reason} accessible accessibilityLabel={r.text}>
            <MaterialCommunityIcons name={r.icon} size={theme.size.icon} color={theme.colors.primary} />
            <Text style={styles.flex}>{r.text}</Text>
          </View>
        ))}
        <Text variant="body14" muted>Si prefieres, puedes marcar tu punto de recogida moviendo el mapa.</Text>
      </View>
      <View style={styles.preActions}>
        <Button label="Permitir ubicación" onPress={onAllow} />
        <Button label="Ahora no" variant="secondary" onPress={onSkip} />
      </View>
    </View>
  );
}

function Card({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text variant="title18">{title}</Text>
      <Text muted>{body}</Text>
      {children}
    </View>
  );
}

const PIN = theme.size.dot * 2;
const PRE_ICON = theme.size.touchMin * 2;
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
    borderColor: theme.colors.text,
  },
  signOut: { position: 'absolute', right: theme.size.screenPadding },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: theme.size.screenPadding, gap: theme.spacing.xs },
  link: { alignSelf: 'center', paddingVertical: theme.spacing.sm, minHeight: theme.size.touchMin },
  flex: { flex: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.size.ctaHeight,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.input,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pre: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.size.screenPadding, justifyContent: 'space-between' },
  preBody: { gap: theme.spacing.md },
  preActions: { gap: theme.spacing.sm },
  preIcon: { width: PRE_ICON, height: PRE_ICON, borderRadius: theme.radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface2, alignSelf: 'center' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, minHeight: theme.size.touchMin },
  card: {
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: theme.radii.card,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
