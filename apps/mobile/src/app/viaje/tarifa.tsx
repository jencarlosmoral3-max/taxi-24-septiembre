import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, MoneyField, Text, TextField } from '@/components';
import { MIN_FARE_CENTS, suggestedFareCents, useRideGuard } from '@/demo/passengerExtras';
import { useDemoRide } from '@/demo/useDemoRide';
import { formatMoney } from '@/lib/money';
import { useTripDraft } from '@/store/tripDraft';
import { theme } from '@/theme/theme';

const MAX_PASSENGERS = 4;

export default function Tarifa() {
  const insets = useSafeAreaInsets();
  const origin = useTripDraft((s) => s.origin);
  const destination = useTripDraft((s) => s.destination);
  const requestRide = useDemoRide((s) => s.requestRide);
  const ok = useRideGuard(['idle']);
  const [fare, setFare] = useState<number | null | undefined>(undefined); // undefined = aun la sugerida
  const [passengers, setPassengers] = useState(1);
  const [comment, setComment] = useState('');

  if (!destination) return <Redirect href="/" />;
  if (!ok) return null;

  const suggested = suggestedFareCents(origin, destination);
  const cents = fare === undefined ? suggested : fare;
  const error = cents === null ? 'Ingresa tu tarifa.' : cents < MIN_FARE_CENTS ? `El mínimo del sindicato es ${formatMoney(MIN_FARE_CENTS)}.` : undefined;
  const bump = (bs: number) => setFare(Math.max(0, (cents ?? suggested) + bs * 100));

  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.spacing.xs, paddingBottom: insets.bottom + theme.spacing.md }]}>
    <KeyboardAvoidingView behavior="padding" style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.back}>
          <MaterialCommunityIcons name="arrow-left" size={theme.size.starInput} color={theme.colors.text} />
        </Pressable>
        <Text variant="title24" accessibilityRole="header">
          Ofrece tu tarifa
        </Text>

        <View style={styles.card}>
          <Row icon="circle-slice-8" color={theme.colors.primary} label="Origen" value={origin?.name ?? 'Mi ubicación'} />
          <Row icon="map-marker" color={theme.colors.text} label="Destino" value={destination.name} />
        </View>

        <View style={styles.suggested}>
          <Text muted>Sugerida</Text>
          <Text variant="amount20">{formatMoney(suggested)}</Text>
        </View>
        <MoneyField valueCents={cents} onChangeCents={setFare} error={error} />
        <View style={styles.chips}>
          {[-1, 1, 2].map((d) => (
            <Chip key={d} label={`${d > 0 ? '+' : '−'}${Math.abs(d)} Bs`} accessibilityLabel={`${d > 0 ? 'Subir' : 'Bajar'} ${Math.abs(d)} boliviano${Math.abs(d) > 1 ? 's' : ''}`} onPress={() => bump(d)} />
          ))}
        </View>

        <View style={styles.stepRow}>
          <Text variant="body16Medium">Pasajeros</Text>
          <View style={styles.stepper}>
            <Chip label="−" accessibilityLabel="Un pasajero menos" disabled={passengers <= 1} onPress={() => setPassengers((p) => p - 1)} />
            <Text variant="amount20" accessibilityLiveRegion="polite" accessibilityLabel={`${passengers} ${passengers === 1 ? 'pasajero' : 'pasajeros'}`} style={styles.count}>
              {passengers}
            </Text>
            <Chip label="+" accessibilityLabel="Un pasajero más" disabled={passengers >= MAX_PASSENGERS} onPress={() => setPassengers((p) => p + 1)} />
          </View>
        </View>

        <TextField label="Comentario para el conductor (opcional)" value={comment} onChangeText={setComment} maxLength={120} placeholder="Ej.: estoy en la puerta azul" />

        <View style={styles.card}>
          <Row icon="cash" color={theme.colors.success} label="Forma de pago" value="Pago en efectivo" />
        </View>
      </ScrollView>
      <View style={styles.cta}>
        {!origin && (
          <Text variant="body14" muted accessibilityLiveRegion="polite">
            Falta tu punto de recogida. Vuelve al inicio y fíjalo.
          </Text>
        )}
        <Button
          label="Buscar conductor"
          disabled={!!error || !origin}
          onPress={() => {
            if (origin && cents !== null && !error) requestRide(cents);
          }}
        />
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}

function Row({ icon, color, label, value }: { icon: 'circle-slice-8' | 'map-marker' | 'cash'; color: string; label: string; value: string }) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${label}: ${value}`}>
      <MaterialCommunityIcons name={icon} size={theme.size.icon} color={color} />
      <View style={styles.flex}>
        <Text variant="body14" muted>
          {label}
        </Text>
        <Text variant="body16Medium" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { paddingHorizontal: theme.size.screenPadding, gap: theme.spacing.md, paddingBottom: theme.spacing.md },
  back: { width: theme.size.touchMin, height: theme.size.touchMin, justifyContent: 'center' },
  flex: { flex: 1 },
  card: { gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radii.card, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  suggested: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', gap: theme.spacing.xs },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  count: { minWidth: theme.spacing.xl, textAlign: 'center' },
  cta: { gap: theme.spacing.xs, paddingHorizontal: theme.size.screenPadding, paddingTop: theme.spacing.xs },
});
