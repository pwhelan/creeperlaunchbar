var calc = require('../app/lib/searchers/all/Calculator'),
	assert = require('assert');

assert.equal(calc.calculate('1 + 2'), 3);
assert.equal(calc.calculate('1 + 2 + 3'), 6);
assert.equal(calc.calculate('4 + 2 * 3 + 1'), 11);
assert.equal(calc.calculate('4 + 2 * (3 + 1)'), 12);
assert.equal(calc.calculate('(4 + 2) * (3 + 1)'), 24);
assert.equal(calc.calculate('(4 * 2 + 1) * (3 + 1)'), 36);
assert.equal(calc.calculate('(4 * (2 + 1)) * (3 + 1)'), 48);
