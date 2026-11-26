import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text, TextField } from '@/components';
import { useSession } from '@/lib/auth';
import { useProfileSetup } from '@/store/profileSetup';
import { theme } from '@/theme/theme';

const AVATAR = theme.size.touchMin * 2;

export default function Registro() {
  const insets = useSafeAreaInsets();
  const meta = useSession()?.user.user_metadata;
  const google = String(meta?.full_name ?? meta?.name ?? '');
  const finish = useProfileSetup((s) => s.finish);
  const [name, setName] = useState(google);
  const [photo, setPhoto] = useState(false); // demo: sin selector de imagenes
  const clean = name.trim();
  const valid = clean.length >= 2;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.container, { paddingTop: insets.top + theme.spacing['3xl'], paddingBottom: insets.bottom + theme.spacing.xl }]}
    >
      <View style={styles.body}>
        <Text variant="title24">¿Cómo te llamamos?</Text>
        <Text muted>Tu nombre y tu foto ayudan a que el conductor te reconozca en el punto de recogida.</Text>
        <View style={styles.photoBox}>
          <View style={[styles.avatar, photo && styles.avatarOn]} accessible accessibilityLabel={photo ? 'Foto de perfil de ejemplo' : 'Sin foto de perfil'}>
            <MaterialCommunityIcons name={photo ? 'account' : 'camera-outline'} size={AVATAR / 2} color={photo ? theme.colors.onPrimary : theme.colors.textMuted} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={photo ? 'Quitar foto (demo)' : 'Agregar foto (demo)'}
            onPress={() => setPhoto((p) => !p)}
            style={styles.photoBtn}
          >
            <Text variant="body14Medium" color={theme.colors.primary}>
              {photo ? 'Quitar foto' : 'Agregar foto (demo)'}
            </Text>
          </Pressable>
        </View>
        <TextField
          label="Nombre"
          placeholder="Tu nombre"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          maxLength={60}
          returnKeyType="done"
          onSubmitEditing={() => valid && finish(clean)}
        />
      </View>
      <View style={styles.actions}>
        <Button label="Continuar" disabled={!valid} onPress={() => finish(clean)} />
        <Button label="Omitir" variant="secondary" onPress={() => finish()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.size.screenPadding, justifyContent: 'space-between' },
  body: { gap: theme.spacing.md },
  actions: { gap: theme.spacing.sm },
  photoBox: { alignItems: 'center', gap: theme.spacing.xs },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  avatarOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  photoBtn: { minHeight: theme.size.touchMin, justifyContent: 'center', paddingHorizontal: theme.spacing.md },
});
