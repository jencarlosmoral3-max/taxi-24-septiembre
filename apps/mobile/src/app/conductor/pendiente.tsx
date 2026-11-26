import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { UNION_WHATSAPP } from '@/demo/driverExtras';
import { useDemoDriver } from '@/demo/useDemoDriver';
import { openUrl } from '@/lib/driverFlow';
import { theme } from '@/theme/theme';

const NEXT = [
  'El sindicato revisa tus documentos y tu vehículo.',
  'Te avisamos cuando tu solicitud esté aprobada.',
  'Entras a Vyro y te pones en línea para recibir pedidos.',
];

export default function Pendiente() {
  const insets = useSafeAreaInsets();
  const approve = useDemoDriver((s) => s.approveApplication);
  const wa = `https://wa.me/${UNION_WHATSAPP}?text=${encodeURIComponent('Hola, consulto por mi solicitud de conductor en Vyro.')}`;
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing['3xl'], paddingBottom: insets.bottom + theme.spacing.md }]}
    >
      <View style={styles.icon}>
        <MaterialCommunityIcons name="clock-outline" size={theme.size.toggleHeight / 2} color={theme.colors.primary} />
      </View>
      <Text variant="title24" accessibilityRole="header">
        Solicitud en revisión
      </Text>
      <Text muted>Recibimos tus datos. El sindicato los está revisando; suele tardar poco.</Text>
      <View style={styles.card}>
        <Text variant="title18">Qué pasa ahora</Text>
        {NEXT.map((t, i) => (
          <View key={t} style={styles.step}>
            <Text variant="body16Medium" color={theme.colors.primary}>
              {i + 1}
            </Text>
            <Text style={styles.flex}>{t}</Text>
          </View>
        ))}
      </View>
      <Button label="Escribir al sindicato por WhatsApp" onPress={() => openUrl(wa)} />
      <Text variant="body14" muted>
        Número de ejemplo: en la versión real aquí va el WhatsApp del sindicato.
      </Text>
      <Button label="Volver al inicio" variant="secondary" onPress={() => router.dismissTo('/conductor')} />
      <View style={styles.demo}>
        <Button
          label="Simular aprobación (demo)"
          variant="pill"
          onPress={() => {
            approve();
            router.dismissTo('/conductor');
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: theme.size.screenPadding, gap: theme.spacing.md },
  icon: {
    width: theme.size.toggleHeight,
    height: theme.size.toggleHeight,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radii.card, backgroundColor: theme.colors.surface },
  step: { flexDirection: 'row', gap: theme.spacing.sm },
  flex: { flex: 1 },
  demo: { marginTop: theme.spacing.lg, alignItems: 'flex-start' },
});
