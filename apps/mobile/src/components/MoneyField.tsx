import { StyleSheet } from 'react-native';

import { theme } from '@/theme/theme';

import { Text } from './Text';
import { TextField } from './TextField';

// Bolivianos enteros (la UI no ofrece centavos). null = vacio.
type Props = { value: number | null; onChange: (bs: number | null) => void; error?: string; label?: string };

export function MoneyField({ value, onChange, error, label = 'Tu tarifa' }: Props) {
  return (
    <TextField
      label={label}
      value={value === null ? '' : String(value)}
      onChangeText={(t) => {
        const d = t.replace(/\D/g, '').slice(0, 4);
        onChange(d === '' ? null : Number(d));
      }}
      keyboardType="number-pad"
      maxLength={4}
      placeholder="0"
      error={error}
      inputStyle={theme.typography.amount20}
      prefix={
        <Text variant="amount20" muted style={styles.bs}>
          Bs
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({ bs: { marginRight: theme.spacing['2xs'] } });
