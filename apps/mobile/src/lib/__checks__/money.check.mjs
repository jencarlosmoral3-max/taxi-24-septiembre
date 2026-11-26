// Ejecutar: node --experimental-strip-types src/lib/__checks__/money.check.mjs (desde apps/mobile)
import assert from 'node:assert/strict';

import { formatMoney } from '../money.ts';

assert.equal(formatMoney(1500), 'Bs 15');
assert.equal(formatMoney(1550), 'Bs 15,50');
assert.equal(formatMoney(1505), 'Bs 15,05');
assert.equal(formatMoney(0), 'Bs 0');
assert.equal(formatMoney(99), 'Bs 0,99');
assert.equal(formatMoney(-250), '-Bs 2,50');
console.log('money.check ok');
