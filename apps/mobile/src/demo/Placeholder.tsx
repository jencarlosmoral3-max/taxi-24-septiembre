// Fase 1 (demo): datos de ejemplo. Se borra en fase 2 (plan-pantallas.md).
// Pantalla vacia pero valida: los agentes A/B/C reemplazan el contenido de cada ruta.
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Text } from '@/components';
import { theme } from '@/theme/theme';

type Props = { title: string; next?: Href; nextLabel?: string; onNext?: () => void; children?: ReactNode };

export function Placeholder({ title, next, nextLabel = 'Siguiente', onNext, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + theme.spacing.xl, paddingBottom: insets.bottom + theme.spacing.md }]}>
      <Text variant="title24" accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.body}>{children}</View>
      {(next || onNext) && <Button label={nextLabel} onPress={() => (onNext ? onNext() : router.navigate(next as Href))} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg, paddingHorizontal: theme.size.screenPadding, gap: theme.spacing.md },
  body: { flex: 1, gap: theme.spacing.sm },
});
