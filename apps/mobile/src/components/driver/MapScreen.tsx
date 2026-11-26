import { Camera, GeoJSONSource, Layer, Marker, type LngLat } from '@maplibre/maplibre-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { VyroMap } from '@/components/VyroMap';
import { theme } from '@/theme/theme';

export type Pin = { lngLat: LngLat; kind: 'pickup' | 'dropoff'; label: string };

type Props = {
  center: LngLat;
  zoom: number;
  pins?: Pin[];
  route?: LngLat[]; // linea de ruta resaltada
  camera?: ReactNode; // reemplaza la camara estatica (modo navegacion)
  mapChildren?: ReactNode; // marcadores extra dentro del mapa
  top?: ReactNode;
  children: ReactNode;
};

// Mapa a pantalla completa con un panel inferior; patron comun del home, recoger y en curso.
export function MapScreen({ center, zoom, pins = [], route, camera, mapChildren, top, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return (
    <View style={styles.root}>
      <VyroMap style={styles.map}>
        {camera ?? <Camera initialViewState={{ center, zoom, padding: { bottom: height * 0.4 } }} />}
        {route && (
          <GeoJSONSource id="ruta" data={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route } }}>
            <Layer
              id="ruta-linea"
              type="line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{ 'line-color': theme.colors.primary, 'line-width': theme.spacing['2xs'] * 1.5 }}
            />
          </GeoJSONSource>
        )}
        {pins.map((p) => (
          <Marker key={p.kind} lngLat={p.lngLat}>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={p.label}
              style={[styles.pin, { backgroundColor: p.kind === 'pickup' ? theme.colors.primary : theme.colors.success }]}
            />
          </Marker>
        ))}
        {mapChildren}
      </VyroMap>
      {!!top && <View pointerEvents="box-none" style={[styles.top, { top: insets.top + theme.spacing.xs }]}>{top}</View>}
      <View style={[styles.panel, { paddingBottom: insets.bottom + theme.spacing.md }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  map: { flex: 1 },
  pin: {
    width: theme.size.icon,
    height: theme.size.icon,
    borderRadius: theme.radii.pill,
    borderWidth: 3,
    borderColor: theme.colors.text,
  },
  top: { position: 'absolute', left: theme.size.screenPadding, right: theme.size.screenPadding, alignItems: 'flex-end' },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: theme.spacing.sm,
    padding: theme.size.screenPadding,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
  },
});
