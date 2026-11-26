import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

// Si la app se abre por vyro://auth/callback fuera de la sesion del navegador, canjea el code y va a "/".
// Con code ya canjeado por openAuthSessionAsync el canje falla sin efecto: el Gate decide el destino.
export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  useEffect(() => {
    if (code) supabase.auth.exchangeCodeForSession(code).catch(() => {});
  }, [code]);
  return <Redirect href="/" />;
}
