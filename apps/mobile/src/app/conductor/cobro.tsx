import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, RatingStars, Text, TextField } from '@/components';
import { useDemoDriver } from '@/demo/useDemoDriver';
import { useBackConfirm, useDriverPhaseGuard } from '@/lib/driverFlow';
import { formatMoney } from '@/lib/money';
import { theme } from '@/theme/theme';

export default function Cobro() {
  const insets = useSafeAreaInsets();
  const ok = useDriverPhaseGuard(['completed']);
  const request = useDemoDriver((s) => s.request);
  const offered = useDemoDriver((s) => s.offeredCents);
  const reset = useDemoDriver((s) => s.reset);
  const [paid, setPaid] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  useBackConfirm(paid ? 'Falta un paso' : 'Falta cobrar', paid ? 'Toca "Listo" para terminar.' : 'Confirma que recibiste el pago.');
  if (!ok || !request || offered === null) return null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.spacing['3xl'], paddingBottom: insets.bottom + theme.spacing.md }]}>
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      {!paid ? (
        <>
          <View style={styles.center}>
            <Text muted>Viaje terminado</Text>
            <Text variant="title24" accessibilityRole="header" style={styles.text}>
              Cobra {formatMoney(offered)} en efectivo
            </Text>
            <Text muted style={styles.text}>
              El pasajero te paga directo, en mano.
            </Text>
          </View>
          <Button label="Recibí el pago" variant="success" onPress={() => setPaid(true)} />
        </>
      ) : (
        <>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.rate}>
            <Text variant="title24" accessibilityRole="header">
              Califica a {request.passenger.full_name}
            </Text>
            <RatingStars value={stars} onChange={setStars} />
            <TextField
              label="Comentario (opcional)"
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={200}
              placeholder="¿Cómo fue el viaje?"
            />
          </ScrollView>
          <Button label="Listo" onPress={reset} />
        </>
      )}
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.size.screenPadding },
  flex: { flex: 1, gap: theme.spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: theme.spacing.sm },
  text: { textAlign: 'center' },
  rate: { gap: theme.spacing.md },
});
