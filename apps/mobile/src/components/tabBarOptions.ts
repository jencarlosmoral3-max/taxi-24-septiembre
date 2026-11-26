import { theme } from '@/theme/theme';

// Uso: <Tabs screenOptions={tabBarOptions}>. Aun no hay rutas de tabs.
export const tabBarOptions = {
  headerShown: false,
  tabBarActiveTintColor: theme.colors.primary,
  tabBarInactiveTintColor: theme.colors.textMuted,
  tabBarStyle: {
    backgroundColor: theme.colors.surface,
    borderTopColor: theme.colors.border,
    minHeight: theme.size.tabBarMinHeight,
  },
  tabBarLabelStyle: theme.typography.body14Medium,
} as const;
