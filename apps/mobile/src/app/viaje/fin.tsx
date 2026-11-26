import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, RatingStars, Text, TextField } from '@/components';
import { useHardwareBack, useRideGuard } from '@/demo/passengerExtras';
import { useDemoRide } from '@/demo/useDemoRide';
import { formatMoney } from '@/lib/money';
import { useTripDraft } from '@/store/tripDraft';
import { theme } from '@/theme/theme';

const noop = () => {};

export default function Fin() {
  const insets = useSafeAreaInsets();
  const { driver, finalFareCents, reset } = useDemoRide();
  const setDestination = useTripDraft((s) => s.setDestination);
  const ok = useRideGuard(['completed']);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  useHardwareBack(noop);

  if (!ok || !driver) return null;
  // La guarda de ruta lleva a inicio al quedar el viaje en 'idle'.
  const done = () => {
    setDestination(null);
    reset();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.root, { paddingTop: insets.top + theme.spacing.xl, paddingBottom: insets.bottom + theme.spacing.md }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text variant="title24" accessibilityRole="header">
          Llegaste a tu destino
        </Text>
        <View style={styles.pay} accessible accessibilityLabel={finalFareCents === null ? 'Paga en efectivo al conductor' : `Paga ${formatMoney(finalFareCents)} en efectivo al conductor`}>
          <Text muted>Paga en efectivo</Text>
          <Text variant="amount32" maxFontSizeMultiplier={1.3} style={styles.amount}>
            {finalFareCents === null ? '—' : formatMoney(finalFareCents)}
          </Text>
        </View>
        <Text>
          Conductor: <Text variant="body16Medium">{driver.profile.full_name ?? 'Conductor'}</Text>
        </Text>
        <Text variant="title18">¿Cómo estuvo tu viaje?</Text>
        <RatingStars value={stars} onChange={setStars} />
        <TextField label="Comentario (opcional)" value={comment} onChangeText={setComment} maxLength={200} multiline />
      </ScrollView>
      <View style={styles.actions}>
        <Button label="Enviar calificación" disabled={stars === 0} onPress={done} />
        <Button label="Omitir" variant="secondary" onPress={done} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingHorizontal: theme.size.screenPadding, gap: theme.spacing.md },
  pay: { alignItems: 'center', gap: theme.spacing['2xs'], padding: theme.spacing.lg, borderRadius: theme.radii.card, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  amount: { color: theme.colors.primary },
  actions: { gap: theme.spacing.sm, paddingHorizontal: theme.size.screenPadding, paddingTop: theme.spacing.xs },
});
