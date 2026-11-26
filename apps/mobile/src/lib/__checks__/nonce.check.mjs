// Ejecutar (desde apps/mobile): node --experimental-strip-types src/lib/__checks__/nonce.check.mjs
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';

import { buildNonce, bytesToHex } from '../hex.ts';

assert.equal(bytesToHex([]), '');
assert.equal(bytesToHex([0, 1, 15, 16, 255]), '00010f10ff');

// Misma funcion que usa la app; solo el SHA-256 se inyecta (node:crypto en lugar de expo-crypto).
const sha256Hex = async (raw) => createHash('sha256').update(raw).digest('hex');
const { raw, hashed } = await buildNonce(randomBytes(32), sha256Hex);
assert.match(raw, /^[0-9a-f]{64}$/);
assert.match(hashed, /^[0-9a-f]{64}$/);
assert.equal(hashed, await sha256Hex(raw));
assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
console.log('nonce.check ok');
