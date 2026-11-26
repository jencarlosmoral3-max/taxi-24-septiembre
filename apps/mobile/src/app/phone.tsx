import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, isValidBoMobile, PhoneField, Text } from '@/components';
import { useSession } from '@/lib/auth';
import { signOut } from '@/lib/googleSignIn';
import { supabase } from '@/lib/supabase';
import { theme } from '@/theme/theme';

const INVALID = 'Ingresa un celular válido: 8 dígitos que empiecen con 6 o 7.';

function messageFor(e: { code?: string; message?: string }) {
  if (e.code === '42501') return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (e.code === 'P0001') {
    if (e.message === 'invalid_phone') return INVALID;
    if (e.message === 'account_deleted') return 'Esta cuenta fue eliminada.';
    if (e.message?.startsWith('phone_locked')) return 'Ahora no puedes cambiar tu número. Contacta al sindicato.';
  }
  return 'No pudimos guardar tu número. Revisa tu conexión e inténtalo de nuevo.';
}

export default function Phone() {
  const insets = useSafeAreaInsets();
  const userId = useSession()?.user.id;
  const qc = useQueryClient();
  const [digits, setDigits] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('set_my_phone', { p_phone: `591${digits}` });
      if (error) throw error;
    },
    // El gate redirige solo cuando get_my_phone devuelve el numero.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-phone', userId] }),
    onError: (e: { code?: string; message?: string }) => setServerError(messageFor(e)),
  });

  const valid = isValidBoMobile(digits);
  const error = serverError ?? (digits.length === 8 && !valid ? INVALID : undefined);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.container, { paddingTop: insets.top + theme.spacing['3xl'], paddingBottom: insets.bottom + theme.spacing.xl }]}
    >
      <View style={styles.body}>
        <Text variant="title24">Tu celular</Text>
        <Text muted>Lo verá el conductor o el pasajero solo cuando tengas un viaje asignado.</Text>
        <PhoneField
          value={digits}
          onChange={(d) => {
            setDigits(d);
            setServerError(null);
          }}
          error={error}
          onSubmit={() => valid && !save.isPending && save.mutate()}
        />
      </View>
      <View style={styles.actions}>
        <Button
          label="Continuar"
          loading={save.isPending}
          disabled={!valid}
          onPress={() => save.mutate()}
        />
        <Button label="Cerrar sesión" variant="secondary" onPress={() => signOut()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.size.screenPadding, justifyContent: 'space-between' },
  body: { gap: theme.spacing.md },
  actions: { gap: theme.spacing.sm },
});
