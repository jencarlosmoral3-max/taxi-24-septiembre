import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, useFonts } from '@expo-google-fonts/poppins';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionProvider, useMyPhone, useSession } from '@/lib/auth';
import { Button, Text } from '@/components';
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

  if (!ready) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SessionProvider>
          <Gate />
        </SessionProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

// Sin sesion -> /login; con sesion y sin telefono -> /phone; si no, el resto de la app.
function Gate() {
  const session = useSession();
  const phone = useMyPhone(session?.user.id);
  const sessionLoaded = session !== undefined;

  useEffect(() => {
    if (sessionLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [sessionLoaded]);

  if (!sessionLoaded) return null;
  if (session && phone.isPending && !phone.isError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  if (session && phone.isError && phone.data === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.md, padding: theme.size.screenPadding }}>
        <Text variant="title20">No pudimos cargar tu cuenta</Text>
        <Text muted>Revisa tu conexión e inténtalo de nuevo.</Text>
        <Button label="Reintentar" onPress={() => phone.refetch()} loading={phone.isFetching} />
      </View>
    );
  }
  const hasSession = !!session;
  const hasPhone = !!phone.data;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.bg } }}>
      <Stack.Protected guard={!hasSession}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={hasSession && !hasPhone}>
        <Stack.Screen name="phone" />
      </Stack.Protected>
      <Stack.Protected guard={hasSession && hasPhone}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev-components" />
        <Stack.Screen name="spike-gps" />
      </Stack.Protected>
    </Stack>
  );
}
