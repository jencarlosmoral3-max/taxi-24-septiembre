import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, RatingStars, Text } from '@/components';
import { CommonScreen, rowStyles } from '@/demo/CommonScreen';
import { formatDateTime, tripDate, tripStatus } from '@/demo/commonExtras';
import { DEMO_TRIPS } from '@/demo/data';
import { formatMoney } from '@/lib/money';
import { theme } from '@/theme/theme';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.field}>
      <Text variant="body14" muted>
        {label}
      </Text>
      <Text variant="body16Medium">{value}</Text>
    </View>
  );
}

export default function DetalleViaje() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = DEMO_TRIPS.find((x) => x.id === id);

  if (!t) {
    return (
      <CommonScreen title="Detalle del viaje">
        <Text muted>No encontramos este viaje. Puede que ya no esté disponible.</Text>
        <Button label="Ver mi historial" variant="secondary" onPress={() => router.replace('/historial')} />
      </CommonScreen>
    );
  }
  const st = tripStatus(t.status);
  const { driver } = t;
  return (
    <CommonScreen title="Detalle del viaje">
      <View style={[rowStyles.row, styles.card]}>
        <Field label="Estado" value={st.label} />
        <Field label="Fecha y hora" value={formatDateTime(tripDate(t))} />
        <Field label="Origen" value={t.origin_text ?? '—'} />
        <Field label="Destino" value={t.destination_text ?? '—'} />
        {t.final_fare_cents !== null && <Field label="Monto" value={formatMoney(t.final_fare_cents)} />}
        <Field label="Pago" value="En efectivo" />
      </View>
      <View style={[rowStyles.row, styles.card]}>
        <Field label="Conductor" value={driver.profile.full_name ?? '—'} />
        <Field label="Auto" value={`${driver.vehicle.brand} ${driver.vehicle.model} ${driver.vehicle.color}`} />
        <Field label="Placa" value={driver.vehicle.plate} />
        <Field label="N.º interno" value={driver.unionNumber} />
        {t.stars !== null && (
          <View accessible accessibilityLabel={`Tu calificación: ${t.stars} de 5 estrellas`} style={styles.field}>
            <Text variant="body14" muted>
              Tu calificación
            </Text>
            <RatingStars value={t.stars} />
          </View>
        )}
      </View>
      <Button label="Reportar un problema" variant="secondary" onPress={() => router.push('/soporte')} />
    </CommonScreen>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'column', alignItems: 'stretch', gap: theme.spacing.sm },
  field: { gap: theme.spacing['2xs'] },
});
