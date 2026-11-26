// Ejecutar (desde apps/mobile): node --experimental-strip-types src/lib/__checks__/money.check.mjs
import assert from 'node:assert/strict';

import { formatMoney, parseMoneyCents, parsePhoneDigits } from '../money.ts';

assert.equal(formatMoney(1500), 'Bs 15');
assert.equal(formatMoney(1550), 'Bs 15,50');
assert.equal(formatMoney(1505), 'Bs 15,05');
assert.equal(formatMoney(0), 'Bs 0');
assert.equal(formatMoney(99), 'Bs 0,99');
assert.equal(formatMoney(-250), '-Bs 2,50');
assert.equal(formatMoney(-0.4), 'Bs 0');
assert.equal(formatMoney(NaN), '—');
assert.equal(formatMoney(Infinity), '—');
assert.equal(formatMoney(99.5), 'Bs 1');

assert.equal(parsePhoneDigits('+591 76123456'), '76123456');
assert.equal(parsePhoneDigits('591-76123456'), '76123456');
assert.equal(parsePhoneDigits('076123456'), '76123456');
assert.equal(parsePhoneDigits('7612'), '7612');
assert.equal(parsePhoneDigits('76123456789'), '76123456');

assert.equal(parseMoneyCents('1.500'), 150000);
assert.equal(parseMoneyCents('15,50'), 1500);
assert.equal(parseMoneyCents('15'), 1500);
assert.equal(parseMoneyCents(''), null);
assert.equal(parseMoneyCents('abc'), null);
console.log('money.check ok');
