import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { signInWithGoogle } from '@/lib/googleSignIn';
import { theme } from '@/theme/theme';

const ERRORS = {
  network: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  deleted: 'Esta cuenta fue eliminada.',
  error: 'No pudimos iniciar sesión. Inténtalo de nuevo.',
} as const;

export default function Login() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancels, setCancels] = useState(0);

  const onPress = async () => {
    setLoading(true);
    setError(null);
    const r = await signInWithGoogle();
    setLoading(false);
    setCancels(r === 'cancelled' ? cancels + 1 : 0);
    if (r === 'network' || r === 'error' || r === 'deleted') setError(ERRORS[r]); // 'cancelled' no muestra nada; 'ok' lo redirige el gate
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + theme.spacing.xl, paddingTop: insets.top }]}>
      <View style={styles.hero}>
        <Image
          source={require('../../assets/images/vyro-wordmark-light.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Vyro"
        />
        <Text muted>Tu taxi, a tu precio.</Text>
      </View>
      <View style={styles.actions}>
        {!!error && (
          <Text variant="body14" color={theme.colors.danger} accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        )}
        {cancels >= 2 && (
          <Text variant="body14" muted style={styles.error}>
            Si no se abrió Google o no volvió a la app, inténtalo de nuevo.
          </Text>
        )}
        <Button label="Continuar con Google" onPress={onPress} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.size.screenPadding },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
  logo: { width: 200, height: 73 },
  actions: { gap: theme.spacing.md },
  error: { textAlign: 'center' },
});
