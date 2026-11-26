import { Map, type StyleSpecification } from '@maplibre/maplibre-react-native';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme/theme';
import vyroDark from '../../assets/map/vyro-dark.json';

// Mapa base de Vyro: estilo empaquetado y controles comunes. El resto de props pasa a MapLibre.
export function VyroMap(props: Omit<ComponentProps<typeof Map>, 'mapStyle'>) {
  const insets = useSafeAreaInsets();
  return (
    <Map
      mapStyle={vyroDark as StyleSpecification}
      touchPitch={false}
      compass={false}
      logo={false}
      attributionPosition={{ top: insets.top + theme.spacing.xs, left: theme.spacing.xs }}
      {...props}
    />
  );
}
