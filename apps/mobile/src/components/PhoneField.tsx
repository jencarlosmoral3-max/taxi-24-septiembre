import { StyleSheet, View } from 'react-native';

import { parsePhoneDigits } from '@/lib/money';
import { theme } from '@/theme/theme';

import { Text } from './Text';
import { TextField } from './TextField';

// Movil boliviano: 8 digitos, empieza con 6 o 7. `value` son solo los 8 digitos (sin +591).
export const isValidBoMobile = (digits: string) => /^[67]\d{7}$/.test(digits);

type Props = { value: string; onChange: (digits: string) => void; error?: string; label?: string; onSubmit?: () => void };

export function PhoneField({ value, onChange, error, label = 'Número de celular', onSubmit }: Props) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={(t) => onChange(parsePhoneDigits(t))}
      inputMode="numeric"
      placeholder="7XXXXXXX"
      autoComplete="tel-national"
      textContentType="telephoneNumber"
      error={error}
      returnKeyType="done"
      onSubmitEditing={onSubmit}
      prefix={
        <View style={styles.prefix} accessible accessibilityLabel="más 591">
          <Text variant="body16Medium">+591</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  prefix: {
    paddingRight: theme.spacing.sm,
    borderRightWidth: 1,
    borderRightColor: theme.colors.border,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
});
