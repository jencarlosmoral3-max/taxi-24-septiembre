import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, useFonts } from '@expo-google-fonts/poppins';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { theme } from '@/theme/theme';

import '../spike/gps-task'; // SPIKE F-06: registra la task tambien en arranque headless

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded, error] = useFonts({ Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold });
  const ready = loaded || !!error; // si falla la fuente, seguir con la del sistema

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
