import * as Crypto from 'expo-crypto';

import { bytesToHex } from './hex';

// Nonce para Google: `hashed` (SHA-256 hex) va a Google y queda en el claim del ID token; `raw` va a signInWithIdToken.
export async function createNonce() {
  const raw = bytesToHex(Crypto.getRandomBytes(32));
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  return { raw, hashed };
}
