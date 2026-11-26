import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components';
import { CommonScreen, rowStyles } from '@/demo/CommonScreen';
import { FAQ } from '@/demo/commonExtras';
import { theme } from '@/theme/theme';

// shortcut: demo sin número real; el del sindicato + Linking (wa.me / tel:) llegan en fase 2.
const contact = (title: string) => Alert.alert(`${title} (demo)`, 'En la demo no se abre la app. En la app real se contacta al sindicato.');

export default function Soporte() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <CommonScreen title="Soporte">
      <Text muted>¿Necesitas ayuda? Escríbele o llama al sindicato.</Text>
      <View style={styles.actions}>
        <Button label="WhatsApp del sindicato" onPress={() => contact('WhatsApp')} />
        <Button label="Llamar" variant="secondary" onPress={() => contact('Llamada')} />
      </View>
      <Text variant="title18" accessibilityRole="header" style={styles.faqTitle}>
        Preguntas frecuentes
      </Text>
      {FAQ.map((f, i) => {
        const expanded = open === i;
        return (
          <Pressable
            key={f.q}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setOpen(expanded ? null : i)}
            style={[rowStyles.row, styles.faq]}
          >
            <View style={styles.q}>
              <Text variant="body16Medium" style={rowStyles.grow}>
                {f.q}
              </Text>
              <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={theme.size.icon} color={theme.colors.textMuted} />
            </View>
            {expanded && (
              <Text variant="body14" muted>
                {f.a}
              </Text>
            )}
          </Pressable>
        );
      })}
    </CommonScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: theme.spacing.sm, marginVertical: theme.spacing.sm },
  faqTitle: { marginTop: theme.spacing.md },
  faq: { flexDirection: 'column', alignItems: 'stretch', gap: theme.spacing.xs },
  q: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
});
