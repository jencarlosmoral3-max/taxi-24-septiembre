import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, OnlineToggle, Text } from '@/components';
import { MapScreen } from '@/components/driver/MapScreen';
import { useDemoDriver } from '@/demo/useDemoDriver';
import { useDriverPhaseGuard } from '@/lib/driverFlow';
import { formatMoney } from '@/lib/money';
import { theme } from '@/theme/theme';

const SANTA_CRUZ: [number, number] = [-63.1821, -17.7833];

export default function ConductorHome() {
  const idle = useDriverPhaseGuard(['idle']);
  const application = useDemoDriver((s) => s.application);
  const online = useDemoDriver((s) => s.online);
  const setOnline = useDemoDriver((s) => s.setOnline);
  const today = useDemoDriver((s) => s.earnings.today);
  if (!idle) return null;

  return (
    <MapScreen
      center={SANTA_CRUZ}
      zoom={14}
      top={<Button label="Perfil" variant="secondary" onPress={() => router.push('/perfil')} />}
    >
      {application === 'none' && (
        <>
          <Text variant="title18">Regístrate como conductor del sindicato</Text>
          <Text muted>Para recibir pedidos, el sindicato debe aprobar tus datos y tu vehículo.</Text>
          <Button label="Registrarme" onPress={() => router.push('/conductor/registro')} />
        </>
      )}
      {application === 'pending' && (
        <>
          <Text variant="title18">Tu solicitud está en revisión</Text>
          <Text muted>Cuando el sindicato la apruebe podrás ponerte en línea.</Text>
          <Button label="Ver estado" onPress={() => router.push('/conductor/pendiente')} />
        </>
      )}
      {application === 'approved' && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ganancias de hoy: ${formatMoney(today.cents)}, ${today.trips} viajes. Ver ganancias`}
            onPress={() => router.push('/conductor/ganancias')}
            style={({ pressed }) => [styles.earnings, pressed && styles.pressed]}
          >
            <View style={styles.flex}>
              <Text variant="body14" muted>
                Hoy
              </Text>
              <Text variant="amount32">{formatMoney(today.cents)}</Text>
            </View>
            <Text variant="body16Medium" muted>
              {today.trips} {today.trips === 1 ? 'viaje' : 'viajes'}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={theme.size.icon} color={theme.colors.textMuted} />
          </Pressable>
          <OnlineToggle online={online} onToggle={setOnline} />
          <Text muted accessibilityLiveRegion="polite" style={styles.hint}>
            {online ? 'Buscando pedidos cerca de ti…' : 'Ponte en línea para recibir pedidos.'}
          </Text>
        </>
      )}
    </MapScreen>
  );
}

const styles = StyleSheet.create({
  earnings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    minHeight: theme.size.ctaHeight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.input,
    backgroundColor: theme.colors.surface2,
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  hint: { textAlign: 'center' },
});
