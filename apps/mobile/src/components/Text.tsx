import { Text as RNText, type TextProps } from 'react-native';

import { theme, type TypographyVariant } from '@/theme/theme';

type Props = TextProps & { variant?: TypographyVariant; muted?: boolean; color?: string };

export function Text({ variant = 'body16', muted, color, style, ...rest }: Props) {
  return (
    <RNText
      {...rest}
      style={[theme.typography[variant], { color: color ?? (muted ? theme.colors.textMuted : theme.colors.text) }, style]}
    />
  );
}
