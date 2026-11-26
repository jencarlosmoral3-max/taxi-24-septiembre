import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components';
import { CommonScreen, rowStyles } from '@/demo/CommonScreen';
import { FAQ, SUPPORT_PHONE } from '@/demo/commonExtras';
import { theme } from '@/theme/theme';

export default function Soporte() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <CommonScreen title="Soporte">
      <Text muted>¿Necesitas ayuda? Escríbele o llama al sindicato.</Text>
      <View style={styles.actions}>
        <Button label="WhatsApp del sindicato" onPress={() => Linking.openURL(`https://wa.me/${SUPPORT_PHONE}`)} />
        <Button label="Llamar" variant="secondary" onPress={() => Linking.openURL(`tel:+${SUPPORT_PHONE}`)} />
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
