export const bytesToHex = (bytes: ArrayLike<number>) =>
  Array.from(bytes as ArrayLike<number>, (b) => b.toString(16).padStart(2, '0')).join('');
