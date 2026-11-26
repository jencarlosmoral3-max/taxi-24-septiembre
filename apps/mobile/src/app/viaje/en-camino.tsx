import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, RatingStars, Text } from '@/components';
import { goToCancel, RideMap, useHardwareBack, useRideGuard, useRideOrigin } from '@/demo/passengerExtras';
import { useDemoRide } from '@/demo/useDemoRide';
import { theme } from '@/theme/theme';

export default function EnCamino() {
  const insets = useSafeAreaInsets();
  const origin = useRideOrigin();
  const { status, driver, etaMin, startRide } = useDemoRide();
  const ok = useRideGuard(['assigned', 'driver_arrived']);
  useHardwareBack(goToCancel);

  if (!ok || !driver) return null;
  const arrived = status === 'driver_arrived';
  // Posicion demo: el taxi se acerca al origen a medida que baja el ETA.
  const pos = arrived ? origin : { lat: origin.lat + 0.0012 * etaMin, lng: origin.lng - 0.0008 * etaMin };
  const { vehicle, profile } = driver;
  const name = profile.full_name ?? 'Conductor';
  const car = [vehicle.brand, vehicle.model, vehicle.color].filter(Boolean).join(' ');

  return (
    <View style={styles.root}>
      <RideMap origin={origin} driver={pos} />
      <View style={[styles.panel, { paddingBottom: insets.bottom + theme.spacing.md }]}>
        {arrived ? (
          <View style={styles.banner} accessible accessibilityLiveRegion="polite" accessibilityLabel={`Tu taxi llegó. Placa ${vehicle.plate}`}>
            <MaterialCommunityIcons name="check-circle" size={theme.size.starInput} color={theme.colors.text} />
            <Text variant="title20">Tu taxi llegó</Text>
          </View>
        ) : (
          <Text variant="title20" accessibilityRole="header" accessibilityLiveRegion="polite">
            Tu conductor llega en {etaMin} min
          </Text>
        )}

        <View style={styles.plateBox} accessible accessibilityLabel={`Placa ${vehicle.plate}. ${car}`}>
          <Text variant="body14" muted>
            Placa
          </Text>
          <Text variant="amount32" maxFontSizeMultiplier={1.3} style={styles.plate}>
            {vehicle.plate}
          </Text>
          <Text variant="body16Medium">
            {car}
          </Text>
        </View>

        <View style={styles.driver}>
          <View style={styles.flex}>
            <Text variant="body16Medium">{name}</Text>
            <Text variant="body14" muted>
              Nº interno {driver.unionNumber}
            </Text>
          </View>
          <RatingStars value={profile.rating_avg ?? 0} />
        </View>

        {arrived && <Button label="Ya estoy en el taxi" onPress={startRide} />}
        <View style={styles.actions}>
          <Button label="Cancelar" variant="secondary" onPress={goToCancel} style={styles.flex} />
          <Button
            label="Llamar"
            variant={arrived ? 'secondary' : 'primary'}
            accessibilityLabel={`Llamar a ${name}`}
            onPress={() => Alert.alert('Llamada (demo)', `En la versión real se llamaría a ${name}.`)}
            style={styles.flex}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  flex: { flex: 1 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.size.screenPadding,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radii.card,
    borderTopRightRadius: theme.radii.card,
  },
  banner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radii.input, backgroundColor: theme.colors.successStrong },
  plateBox: { alignItems: 'center', padding: theme.spacing.md, borderRadius: theme.radii.card, backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border },
  plate: { color: theme.colors.primary },
  driver: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  actions: { flexDirection: 'row', gap: theme.spacing.sm },
});
