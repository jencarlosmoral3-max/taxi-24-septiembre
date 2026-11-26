// Fase 1 (demo): datos y piezas compartidas de las pantallas del viaje del pasajero. Se borra en fase 2.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Camera, GeoJSONSource, Layer, Marker, type LngLat } from '@maplibre/maplibre-react-native';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';

import { VyroMap } from '@/components';
import type { Place } from '@/store/tripDraft';
import { theme } from '@/theme/theme';

import { useTripDraft } from '@/store/tripDraft';

import { useDemoRide, type RideStatus } from './useDemoRide';

export const MIN_FARE_CENTS = 1000; // minimo del sindicato (app_config)

// Si no hay origen en el borrador (p. ej. recarga de la app), las pantallas del viaje usan el centro de Cochabamba en vez de quedar en blanco.
const FALLBACK_ORIGIN: Place = { name: 'Mi ubicación', address: 'Cochabamba', lat: -17.3935, lng: -66.157 };
export const useRideOrigin = (): Place => useTripDraft((s) => s.origin) ?? FALLBACK_ORIGIN;

// Distancia en linea recta (haversine), km.
export function distanceKm(a: Place, b: Place): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// Bs 10 base + Bs 4/km, redondeado a Bs enteros, nunca bajo el minimo.
export function suggestedFareCents(origin: Place | null, destination: Place): number {
  const km = origin ? distanceKm(origin, destination) : 0;
  return Math.max(MIN_FARE_CENTS, Math.round(10 + 4 * km) * 100);
}

export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduce(v), () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

// Atrás de hardware: ejecuta onBack en lugar de salir de la pantalla. Tambien desactiva el gesto de atras de iOS.
export function useHardwareBack(onBack: () => void) {
  const navigation = useNavigation();
  useEffect(() => navigation.setOptions({ gestureEnabled: false }), [navigation]);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });
      return () => sub.remove();
    }, [onBack]),
  );
}

export const goToCancel = () => router.navigate('/viaje/cancelar');

function routeFor(s: RideStatus) {
  if (s === 'requested') return '/viaje/esperando';
  if (s === 'assigned' || s === 'driver_arrived') return '/viaje/en-camino';
  if (s === 'in_progress') return '/viaje/en-curso';
  if (s === 'completed') return '/viaje/fin';
  return null; // idle y estados terminales: inicio
}

// La pantalla solo vale en ciertos estados; si el viaje esta en otro, navega a su pantalla (o a inicio).
// Las acciones de las pantallas solo cambian el estado: esta es la unica navegacion entre pasos.
export function useRideGuard(allowed: RideStatus[]): boolean {
  const status = useDemoRide((s) => s.status);
  const ok = allowed.includes(status);
  // useFocusEffect: corre al enfocar y al cambiar el estado estando enfocada (sin redirigir si no es la pantalla activa).
  useFocusEffect(
    useCallback(() => {
      if (ok) return;
      const to = routeFor(status);
      if (to) router.replace(to);
      else router.dismissTo('/');
    }, [ok, status]),
  );
  return ok;
}

export function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

const lngLat = (p: { lat: number; lng: number }): LngLat => [p.lng, p.lat];

type MapProps = { origin: Place; destination?: Place; driver?: { lat: number; lng: number }; route?: boolean };

// Mapa de fondo de las pantallas del viaje: marcadores propio / conductor / destino y ruta recta opcional.
export function RideMap({ origin, destination, driver, route }: MapProps) {
  const { height } = useWindowDimensions();
  const pts = [origin, destination, driver].filter((p): p is { lat: number; lng: number } => !!p);
  const bottom = height * 0.5; // el panel inferior tapa ~la mitad
  const bounds = pts.length > 1
    ? ([Math.min(...pts.map((p) => p.lng)), Math.min(...pts.map((p) => p.lat)), Math.max(...pts.map((p) => p.lng)), Math.max(...pts.map((p) => p.lat))] as [number, number, number, number])
    : null;
  const pad = theme.size.screenPadding * 2;
  return (
    <VyroMap style={StyleSheet.absoluteFill}>
      <Camera
        initialViewState={
          bounds
            ? { bounds, padding: { top: pad * 2, left: pad, right: pad, bottom } }
            : { center: lngLat(origin), zoom: 15, padding: { top: 0, left: 0, right: 0, bottom } }
        }
      />
      {route && destination && (
        <GeoJSONSource
          id="ruta"
          data={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [lngLat(origin), lngLat(destination)] } }}
        >
          <Layer id="ruta-linea" type="line" paint={{ 'line-color': theme.colors.primary, 'line-width': theme.spacing['2xs'] }} />
        </GeoJSONSource>
      )}
      <Marker lngLat={lngLat(origin)}>
        <View style={styles.dot} accessible accessibilityLabel="Punto de recogida" />
      </Marker>
      {destination && (
        <Marker lngLat={lngLat(destination)}>
          <View accessible accessibilityLabel="Destino">
            <MaterialCommunityIcons name="map-marker" size={theme.size.starInput} color={theme.colors.text} />
          </View>
        </Marker>
      )}
      {driver && (
        <Marker lngLat={lngLat(driver)}>
          <View style={styles.car} accessible accessibilityLabel="Tu taxi">
            <MaterialCommunityIcons name="taxi" size={theme.size.icon} color={theme.colors.onPrimary} />
          </View>
        </Marker>
      )}
    </VyroMap>
  );
}

// Indicador de busqueda: punto con pulso; estatico si el sistema pide reducir movimiento.
export function Pulse() {
  const reduce = useReduceMotion();
  const [v] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1400, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduce, v]);
  return (
    <View style={styles.pulseBox} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {!reduce && (
        <Animated.View
          style={[
            styles.ring,
            { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }] },
          ]}
        />
      )}
      <View style={styles.core} />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: theme.size.icon,
    height: theme.size.icon,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.text,
  },
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
  pulseBox: { width: theme.size.touchMin, height: theme.size.touchMin, alignItems: 'center', justifyContent: 'center' },
  core: { width: theme.size.dot * 1.5, height: theme.size.dot * 1.5, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary },
  ring: { position: 'absolute', width: theme.size.dot * 1.5, height: theme.size.dot * 1.5, borderRadius: theme.radii.pill, backgroundColor: theme.colors.primary },
});
