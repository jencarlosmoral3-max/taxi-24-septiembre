import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
} from 'react-native-nitro-google-signin';

import { createNonce } from './nonce';
import { supabase } from './supabase';

export type SignInResult = 'ok' | 'cancelled' | 'network' | 'error';

// El nonce se fija en configure(): se reconfigura en cada intento para que sea nuevo y de un solo uso.
export async function signInWithGoogle(): Promise<SignInResult> {
  try {
    const { raw, hashed } = await createNonce();
    GoogleOneTapSignIn.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '', nonce: hashed });
    await GoogleOneTapSignIn.checkPlayServices();
    const res = await GoogleOneTapSignIn.presentExplicitSignIn();
    if (isCancelledResponse(res)) return 'cancelled';
    if (!isSuccessResponse(res) || !res.data.idToken) return 'error';
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: res.data.idToken, nonce: raw });
    if (!error) return 'ok';
    return /network|fetch/i.test(error.message) ? 'network' : 'error';
  } catch (e) {
    if (isErrorWithCode(e) && /cancel/i.test(String(e.code))) return 'cancelled';
    return /network|fetch|timeout/i.test(String((e as Error)?.message)) ? 'network' : 'error';
  }
}

export async function signOut() {
  await GoogleOneTapSignIn.signOut().catch(() => {});
  await supabase.auth.signOut();
}
