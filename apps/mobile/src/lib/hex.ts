export const bytesToHex = (bytes: ArrayLike<number>) =>
  Array.from(bytes as ArrayLike<number>, (b) => b.toString(16).padStart(2, '0')).join('');

// raw: 64 hex del azar; hashed: SHA-256 hex de raw. `sha256Hex` se inyecta (expo-crypto en la app).
export async function buildNonce(randomBytes: ArrayLike<number>, sha256Hex: (raw: string) => Promise<string>) {
  const raw = bytesToHex(randomBytes);
  return { raw, hashed: await sha256Hex(raw) };
}
