// Ejecutar (desde apps/mobile): node --experimental-strip-types src/lib/__checks__/nonce.check.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { bytesToHex } from '../hex.ts';

assert.equal(bytesToHex([]), '');
assert.equal(bytesToHex([0, 1, 15, 16, 255]), '00010f10ff');
const raw = bytesToHex(Uint8Array.from({ length: 32 }, (_, i) => i * 8));
assert.match(raw, /^[0-9a-f]{64}$/);
// Mismo digest hex que usa expo-crypto (SHA-256 sobre el string raw, salida hex minuscula).
const hashed = createHash('sha256').update(raw).digest('hex');
assert.equal(hashed, bytesToHex(createHash('sha256').update(raw).digest()));
assert.equal(createHash('sha256').update('abc').digest('hex'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
console.log('nonce.check ok');
