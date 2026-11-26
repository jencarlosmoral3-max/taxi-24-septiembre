import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@vyro/db-types';
import { AppState } from 'react-native';

// shortcut: sesion en AsyncStorage (sin cifrar), el default de la guia Expo de Supabase; SecureStore+aes-js si el riesgo de root/backup lo exige.
export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } },
);

// Refresco solo con la app en primer plano (patron de la guia de Supabase para RN).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
