import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

import { theme } from '@/theme/theme';

import { Text } from './Text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  prefix?: ReactNode; // contenido fijo a la izquierda (p. ej. "+591")
  inputStyle?: StyleProp<TextStyle>;
};

export function TextField({ label, error, prefix, inputStyle, onFocus, onBlur, editable = true, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="body14Medium" muted>
        {label}
      </Text>
      <View
        style={[
          styles.box,
          focused && { borderColor: theme.colors.primary },
          !!error && { borderColor: theme.colors.danger },
          !editable && styles.disabled,
        ]}
      >
        {prefix}
        <TextInput
          accessibilityLabel={error ? `${label}. ${error}` : label}
          placeholderTextColor={theme.colors.textMuted}
          selectionColor={theme.colors.primary}
          editable={editable}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, inputStyle]}
          {...rest}
        />
      </View>
      {!!error && (
        <Text variant="body14" color={theme.colors.danger} accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing['2xs'] },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.size.ctaHeight,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radii.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: { ...theme.typography.body16, flex: 1, color: theme.colors.text, paddingVertical: theme.spacing.sm },
  disabled: { opacity: 0.5 },
});
