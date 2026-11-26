import { StyleSheet } from 'react-native';

import { parseMoneyCents } from '@/lib/money';
import { theme } from '@/theme/theme';

import { Text } from './Text';
import { TextField } from './TextField';

// Reporta CENTAVOS (igual que formatMoney); la UI solo admite bolivianos enteros. null = vacio.
type Props = { valueCents: number | null; onChangeCents: (cents: number | null) => void; error?: string; label?: string };

export function MoneyField({ valueCents, onChangeCents, error, label = 'Tu tarifa' }: Props) {
  return (
    <TextField
      label={label}
      value={valueCents === null ? '' : String(Math.floor(valueCents / 100))}
      onChangeText={(t) => onChangeCents(parseMoneyCents(t))}
      inputMode="numeric"
      placeholder="0"
      error={error}
      inputStyle={theme.typography.amount20}
      prefix={
        <Text variant="amount20" muted maxFontSizeMultiplier={1.3} style={styles.bs}>
          Bs
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({ bs: { marginRight: theme.spacing['2xs'] } });
