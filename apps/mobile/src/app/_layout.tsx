import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, useFonts } from '@expo-google-fonts/poppins';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { theme } from '@/theme/theme';

import '../spike/gps-task'; // SPIKE F-06: registra la task tambien en arranque headless

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {});
const queryClient = new QueryClient();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    ...MaterialCommunityIcons.font,
  });
  const [timedOut, setTimedOut] = useState(false);
  const ready = loaded || !!error || timedOut; // si la fuente falla o tarda >4 s, seguir con la del sistema

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
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
