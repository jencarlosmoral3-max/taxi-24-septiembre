import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { CommonScreen, rowStyles } from '@/demo/CommonScreen';
import { maskPhone } from '@/demo/commonExtras';
import { resetDemo } from '@/demo/reset';
import { useMyPhone, useSession } from '@/lib/auth';
import { signOut } from '@/lib/googleSignIn';
import { useAppMode, type AppMode } from '@/store/appMode';
import { theme } from '@/theme/theme';

const MODES: { mode: AppMode; label: string }[] = [
  { mode: 'passenger', label: 'Pasajero' },
  { mode: 'driver', label: 'Conductor' },
];

function Row({ icon, label, onPress, danger }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; onPress: () => void; danger?: boolean }) {
  const color = danger ? theme.colors.danger : theme.colors.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [rowStyles.row, pressed && styles.pressed]}>
      <MaterialCommunityIcons name={icon} size={theme.size.icon} color={color} />
      <Text variant="body16Medium" color={color} style={rowStyles.grow}>
        {label}
      </Text>
      {!danger && <MaterialCommunityIcons name="chevron-right" size={theme.size.icon} color={theme.colors.textMuted} />}
    </Pressable>
  );
}

export default function Perfil() {
  const session = useSession();
  const phone = useMyPhone(session?.user.id).data;
  const { mode, setMode } = useAppMode();
  const name = (session?.user.user_metadata?.full_name as string | undefined) || 'Pasajero';

  const pick = (m: AppMode) => {
    if (m === mode) return;
    // setMode antes de navegar: index.tsx redirige a /conductor si es conductor; ir directo a /conductor corre contra el guard.
    resetDemo();
    setMode(m);
    router.replace('/');
  };

  const confirmSignOut = () =>
    Alert.alert('Cerrar sesión', '¿Quieres salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => signOut().catch(() => Alert.alert('No se pudo cerrar sesión', 'Inténtalo de nuevo.')) },
    ]);

  // Fase 1: no borra nada.
  const confirmDelete = () =>
    Alert.alert('Eliminar cuenta', 'En la demo no se envía nada. En la app real se envía la solicitud al sindicato.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar solicitud', style: 'destructive', onPress: () => Alert.alert('Solicitud enviada (demo)', 'En esta versión no se elimina nada.') },
    ]);

  return (
    <CommonScreen title="Perfil y ajustes">
      <View style={styles.head}>
        <Text variant="title20">{name}</Text>
        <Text muted accessibilityLabel={phone ? `Teléfono terminado en ${phone.replace(/\D/g, '').slice(-3)}` : undefined}>{phone ? `Teléfono de contacto: ${maskPhone(phone)}` : 'Sin teléfono de contacto'}</Text>
      </View>

      <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel="Modo de la app">
        {MODES.map((m) => {
          const on = m.mode === mode;
          return (
            <Pressable key={m.mode} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => pick(m.mode)} style={[styles.seg, on && styles.segOn]}>
              <Text variant="body16Medium" color={on ? theme.colors.onPrimary : theme.colors.text}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Row icon="history" label="Historial" onPress={() => router.push('/historial')} />
      <Row icon="lifebuoy" label="Soporte" onPress={() => router.push('/soporte')} />
      <Row icon="logout" label="Cerrar sesión" onPress={confirmSignOut} />
      <Row icon="account-remove" label="Eliminar cuenta" onPress={confirmDelete} danger />

      <Text variant="body14" muted style={styles.version}>
        Vyro {Constants.expoConfig?.version ?? ''}
      </Text>
    </CommonScreen>
  );
}

const styles = StyleSheet.create({
  head: { gap: theme.spacing['2xs'], paddingVertical: theme.spacing.md },
  segment: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderRadius: theme.radii.pill, padding: theme.spacing['2xs'], marginBottom: theme.spacing.xs },
  seg: { flex: 1, minHeight: theme.size.touchMin, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radii.pill },
  segOn: { backgroundColor: theme.colors.primary },
  pressed: { opacity: 0.8 },
  version: { textAlign: 'center', marginTop: theme.spacing.md },
});
