import { useQuery } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

// undefined = leyendo la sesion guardada
const SessionContext = createContext<Session | null | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);

// get_my_phone puede devolver null aunque el tipo generado diga string.
export function useMyPhone(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-phone', userId],
    enabled: !!userId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc('get_my_phone');
      if (error) throw error;
      return (data as string | null) || null;
    },
  });
}
