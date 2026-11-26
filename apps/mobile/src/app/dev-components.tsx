// Solo desarrollo (P-01): muestra todos los componentes para verificacion visual.
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BottomSheet,
  Button,
  Chip,
  MoneyField,
  OfferCard,
  OnlineToggle,
  PhoneField,
  RatingStars,
  RequestCard,
  Text,
  TextField,
} from '@/components';
import { useAppMode } from '@/store/appMode';
import { theme } from '@/theme/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title18" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

export default function DevComponents() {
  const insets = useSafeAreaInsets();
  const { mode, setMode } = useAppMode();
  const [phone, setPhone] = useState('7123456');
  const [money, setMoney] = useState<number | null>(15);
  const [text, setText] = useState('');
  const [chip, setChip] = useState('a');
  const [online, setOnline] = useState(false);
  const [rating, setRating] = useState(4);
  const [sheet, setSheet] = useState(false);
  const noop = () => {};

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: theme.size.screenPadding, paddingTop: insets.top + theme.spacing.md, paddingBottom: insets.bottom + theme.spacing['3xl'], gap: theme.spacing['2xl'] }}
    >
      <Text variant="title24">Componentes · modo {mode}</Text>
      <Section title="Botones">
        <Button label="Pedir taxi" onPress={() => setMode(mode === 'driver' ? 'passenger' : 'driver')} />
        <Button label="Secundario" variant="secondary" onPress={noop} />
        <Button label="Cancelar viaje" variant="danger" onPress={noop} />
        <Button label="Cargando" loading onPress={noop} />
        <Button label="Deshabilitado" disabled onPress={noop} />
        <Button label="Pill" variant="pill" onPress={noop} />
      </Section>
      <Section title="Campos">
        <TextField label="Nombre" value={text} onChangeText={setText} placeholder="Tu nombre" />
        <PhoneField value={phone} onChange={setPhone} />
        <PhoneField value="12" onChange={noop} error="Debe empezar con 6 o 7 y tener 8 dígitos" />
        <MoneyField value={money} onChange={setMoney} />
      </Section>
      <Section title="Chips">
        <View style={styles.row}>
          {['a', 'b', 'c'].map((c) => (
            <Chip key={c} label={`Opción ${c.toUpperCase()}`} selected={chip === c} onPress={() => setChip(c)} />
          ))}
        </View>
      </Section>
      <Section title="En línea">
        <OnlineToggle online={online} onToggle={setOnline} />
      </Section>
      <Section title="Calificación">
        <RatingStars value={4.6} />
        <RatingStars value={rating} onChange={setRating} />
      </Section>
      <Section title="Oferta (pasajero)">
        <OfferCard
          driverName="Carlos Mamani"
          rating={4.8}
          carModel="Toyota Vitz"
          carColor="Blanco"
          plate="3456-KLM"
          unionNumber="24"
          etaMin={4}
          priceCents={1500}
          onAccept={noop}
          onReject={noop}
        />
      </Section>
      <Section title="Pedido entrante (conductor)">
        <RequestCard
          origin="Av. Cañoto esq. Ibérica"
          destination="Aeropuerto Viru Viru"
          distanceKm={12.4}
          offeredCents={3500}
          expiresInSeconds={30}
          onAccept={noop}
          onCounter={noop}
          onIgnore={noop}
        />
      </Section>
      <Section title="Bottom sheet">
        <Button label="Abrir" variant="secondary" onPress={() => setSheet(true)} />
      </Section>
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="¿Cancelar el viaje?">
        <Text muted>El conductor ya está en camino.</Text>
        <Button label="Sí, cancelar" variant="danger" onPress={() => setSheet(false)} />
        <Button label="Volver" variant="secondary" onPress={() => setSheet(false)} />
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  section: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
});
