// Tokens de docs/arte.md. Unica fuente de colores/medidas: no hardcodear fuera de aqui.
export const theme = {
  colors: {
    bg: '#191919',
    surface: '#242424',
    surface2: '#2E2E2E',
    border: '#3A3A3A',
    primary: '#F6C200',
    onPrimary: '#191919',
    danger: '#FF3B30', // texto/icono sobre fondo oscuro
    dangerStrong: '#D92D20', // relleno con texto blanco
    success: '#1FA05A',
    successStrong: '#178048',
    text: '#FFFFFF',
    textMuted: '#A6A6A6',
    scrim: 'rgba(0,0,0,0.6)',
  },
  spacing: { '2xs': 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 40, '4xl': 48 },
  radii: { input: 12, card: 16, pill: 999 },
  size: {
    touchMin: 48,
    ctaHeight: 56,
    screenPadding: 20,
    toggleHeight: 72,
    dot: 12,
    handleWidth: 40,
    handleHeight: 4,
    tabBarMinHeight: 64,
    starInput: 36,
    icon: 20,
    starDisplay: 16,
  },
  fonts: {
    regular: 'Poppins_400Regular',
    medium: 'Poppins_500Medium',
    semibold: 'Poppins_600SemiBold',
  },
  typography: {
    title24: { fontFamily: 'Poppins_600SemiBold', fontSize: 24, lineHeight: 32 },
    title20: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, lineHeight: 28 },
    title18: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, lineHeight: 26 },
    body16: { fontFamily: 'Poppins_400Regular', fontSize: 16, lineHeight: 24 },
    body16Medium: { fontFamily: 'Poppins_500Medium', fontSize: 16, lineHeight: 24 },
    body14: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 20 },
    body14Medium: { fontFamily: 'Poppins_500Medium', fontSize: 14, lineHeight: 20 },
    amount32: { fontFamily: 'Poppins_600SemiBold', fontSize: 32, lineHeight: 40, fontVariant: ['tabular-nums'] },
    amount20: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, lineHeight: 28, fontVariant: ['tabular-nums'] },
  },
} as const;

export type Theme = typeof theme;
export type TypographyVariant = keyof Theme['typography'];
