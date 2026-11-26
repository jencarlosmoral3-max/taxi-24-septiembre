import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Text } from '@/components';
import { useRideGuard } from '@/demo/passengerExtras';
import { useDemoRide } from '@/demo/useDemoRide';
import { theme } from '@/theme/theme';

const REASONS = ['El conductor tarda mucho', 'Cambié de planes', 'Pedí por error', 'El conductor pidió cancelar', 'Otro'];

export default function Cancelar() {
  const insets = useSafeAreaInsets();
  const { cancel, reset } = useDemoRide();
  const ok = useRideGuard(['requested', 'assigned', 'driver_arrived']);
  const [reason, setReason] = useState<string | null>(null);

  if (!ok) return null;
  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.spacing.xl, paddingBottom: insets.bottom + theme.spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="title24" accessibilityRole="header">
          ¿Por qué cancelas?
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {REASONS.map((r) => (
            <Chip key={r} label={r} selected={r === reason} role="radio" onPress={() => setReason(r)} />
          ))}
        </View>
      </ScrollView>
      <View style={styles.actions}>
        {/* La guarda de ruta lleva a inicio al quedar el viaje en 'idle'. */}
        <Button
          label="Cancelar viaje"
          variant="danger"
          disabled={!reason}
          onPress={() => {
            if (!reason) return;
            cancel(reason);
            reset();
          }}
        />
        <Button label="Volver" variant="secondary" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.size.screenPadding },
  scroll: { gap: theme.spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  actions: { gap: theme.spacing.sm },
});
