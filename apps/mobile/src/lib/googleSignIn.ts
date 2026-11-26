import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { resetDemo } from '@/demo/reset';
import { useAppMode } from '@/store/appMode';
import { useTripDraft } from '@/store/tripDraft';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type SignInResult = 'ok' | 'cancelled' | 'network' | 'deleted' | 'error';

const NETWORK = /network|fetch|timeout/i;

// Canjea el `code` PKCE de una URL de retorno (vyro://auth/callback?code=...) por la sesion.
export async function exchangeFromUrl(url: string): Promise<SignInResult> {
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;
  if (typeof code !== 'string') {
    const desc = String(queryParams?.error_description ?? queryParams?.error ?? '');
    return /banned/i.test(desc) ? 'deleted' : 'error';
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) return 'ok';
  if (error.code === 'user_banned') return 'deleted';
  return NETWORK.test(error.message) ? 'network' : 'error';
}

export async function signInWithGoogle(): Promise<SignInResult> {
  try {
    const redirectTo = Linking.createURL('auth/callback');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
    });
    if (error || !data.url) return error && NETWORK.test(error.message) ? 'network' : 'error';
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success') return 'cancelled';
    return await exchangeFromUrl(result.url);
  } catch (e) {
    return NETWORK.test(String((e as Error)?.message)) ? 'network' : 'error';
  }
}

export async function signOut() {
  await supabase.auth.signOut({ scope: 'local' });
  // Privacidad: otra cuenta en el mismo telefono no debe ver recientes ni viaje anterior.
  useTripDraft.getState().reset();
  await useTripDraft.persist.clearStorage();
  useAppMode.getState().setMode('passenger');
  resetDemo();
}
