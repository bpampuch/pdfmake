const assert = require('assert');
const util = require('util');

const { isString } = require('../../js/helpers/variableType');


const valuesToCheck = [
	'Abc123',
	'12',
	'12.34',
	'0',
	'',
	56,
	56.78,
	0,
	true,
	false,
	null,
	undefined,
	{ dummyObject: 0 },
];

var checkValues = (fnc, expected) => {
	for (key in valuesToCheck) {
		assert.equal(fnc(valuesToCheck[key]), expected[key], 'Exception for value ' + util.inspect(valuesToCheck[key], { showHidden: false, depth: null }));
	}
};

describe('helpers/variableType', function () {

	it('isString', function () {
		checkValues(isString, [true, true, true, true, true, false, false, false, false, false, false, false, false]);
	});

});
