import * as Crypto from 'expo-crypto';

import { buildNonce } from './hex';

// `hashed` va a Google (queda en el claim del ID token); `raw` va a signInWithIdToken.
export const createNonce = () =>
  buildNonce(Crypto.getRandomBytes(32), (raw) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw));
