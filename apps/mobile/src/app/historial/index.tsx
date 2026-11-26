import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components';
import { CommonScreen, rowStyles } from '@/demo/CommonScreen';
import { formatDateTime, tripStatus } from '@/demo/commonExtras';
import { DEMO_TRIPS } from '@/demo/data';
import { formatMoney } from '@/lib/money';
import { theme } from '@/theme/theme';

export default function Historial() {
  return (
    <CommonScreen title="Historial de viajes">
      {DEMO_TRIPS.length === 0 && (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="taxi" size={theme.size.icon * 2} color={theme.colors.textMuted} />
          <Text muted style={styles.center}>
            Aún no tienes viajes. Cuando hagas el primero, aparecerá aquí.
          </Text>
        </View>
      )}
      {DEMO_TRIPS.map((t) => {
        const st = tripStatus(t.status);
        const date = formatDateTime(t.completed_at, false);
        return (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            accessibilityLabel={`${date}, de ${t.origin_text} a ${t.destination_text}, ${t.final_fare_cents === null ? '' : formatMoney(t.final_fare_cents) + ', '}${st.label}`}
            onPress={() => router.push({ pathname: '/historial/[id]', params: { id: t.id } })}
            style={({ pressed }) => [rowStyles.row, styles.trip, pressed && styles.pressed]}
          >
            <View style={styles.line}>
              <Text variant="body14" muted>
                {date}
              </Text>
              <Text variant="body14Medium" color={st.ok ? theme.colors.success : theme.colors.danger}>
                {st.label}
              </Text>
            </View>
            <Text variant="body16Medium">
              {t.origin_text} → {t.destination_text}
            </Text>
            {t.final_fare_cents !== null && <Text variant="amount20">{formatMoney(t.final_fare_cents)}</Text>}
          </Pressable>
        );
      })}
    </CommonScreen>
  );
}

const styles = StyleSheet.create({
  trip: { flexDirection: 'column', alignItems: 'stretch', gap: theme.spacing['2xs'] },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  pressed: { opacity: 0.8 },
  empty: { alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing['4xl'] },
  center: { textAlign: 'center' },
});
