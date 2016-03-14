var calc = require('../app/lib/searchers/all/Calculator'),
	assert = require('assert');

assert.equal(calc.calculate('1 + 2'), 3);
assert.equal(calc.calculate('1 + 2 + 3'), 6);
assert.equal(calc.calculate('4 + 2 * 3 + 1'), 11);
assert.equal(calc.calculate('4 + 2 * (3 + 1)'), 12);
assert.equal(calc.calculate('(4 + 2) * (3 + 1)'), 24);
