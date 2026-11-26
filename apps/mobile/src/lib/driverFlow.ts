import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, BackHandler, Linking } from 'react-native';

import { useDemoDriver, type DriverPhase } from '@/demo/useDemoDriver';

// Ruta que corresponde a cada fase del viaje del conductor.
const ROUTE: Record<DriverPhase, Href> = {
  idle: '/conductor',
  incoming: '/conductor/solicitud',
  waiting: '/conductor/esperando',
  assigned: '/conductor/recoger',
  driver_arrived: '/conductor/recoger',
  in_progress: '/conductor/en-curso',
  completed: '/conductor/cobro',
};

// La fase manda: si la pantalla no corresponde a la fase actual, va a la que si. Devuelve true si esta bien.
export function useDriverPhaseGuard(accepted: DriverPhase[]): boolean {
  const phase = useDemoDriver((s) => s.phase);
  const ok = accepted.includes(phase);
  // Solo con la pantalla enfocada: las de abajo en la pila no redirigen (evita pantallas duplicadas).
  useFocusEffect(
    useCallback(() => {
      if (ok) return;
      // Siempre replace: las transiciones anteriores reemplazaron el home, asi que la pila termina con un solo home.
      router.replace(ROUTE[phase]);
    }, [ok, phase]),
  );
  return ok;
}

export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Volver', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

// Atras de Android: nunca abandona en silencio. Con onConfirm pide confirmar; sin el, solo avisa.
export function useBackConfirm(title: string, message: string, confirmLabel?: string, onConfirm?: () => void) {
  const action = useRef(onConfirm);
  useEffect(() => {
    action.current = onConfirm;
  }, [onConfirm]);
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (action.current && confirmLabel) confirmAction(title, message, confirmLabel, () => action.current?.());
        else Alert.alert(title, message, [{ text: 'Entendido' }]);
        return true;
      });
      return () => sub.remove();
    }, [title, message, confirmLabel]),
  );
}

// Navegacion externa: intent de Google Maps, luego geo:, luego web.
export async function openNavigation(lat: number, lng: number) {
  const urls = [
    `google.navigation:q=${lat},${lng}`,
    `geo:${lat},${lng}?q=${lat},${lng}`,
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  ];
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // probar el siguiente
    }
  }
  Alert.alert('No pudimos abrir la navegación', 'Instala Google Maps o revisa tu conexión.');
}

export function openUrl(url: string) {
  Linking.openURL(url).catch(() =>
    url.startsWith('tel:')
      ? Alert.alert('No pudimos llamar', 'Tu dispositivo no puede hacer llamadas.')
      : Alert.alert('No pudimos abrirlo', 'Inténtalo de nuevo.'),
  );
}
