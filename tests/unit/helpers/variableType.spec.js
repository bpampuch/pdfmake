const assert = require('assert');
const util = require('util');

const { isString, isNumber, isObject, isEmptyObject, isValue } = require('../../../js/helpers/variableType');

const variableCheckMap = [
	{
		value: 'Abc123',
		type: [isString, isValue]
	},
	{
		value: '12',
		type: [isString, isValue]
	},
	{
		value: '12.34',
		type: [isString, isValue]
	},
	{
		value: '0',
		type: [isString, isValue]
	},
	{
		value: '',
		type: [isString, isValue]
	},
	{
		value: new String('Abcdef'),
		type: [isString, isValue]
	},
	{
		value: 56,
		type: [isNumber, isValue]
	},
	{
		value: 56.78,
		type: [isNumber, isValue]
	},
	{
		value: 0,
		type: [isNumber, isValue]
	},
	{
		value: new Number(78),
		type: [isNumber, isValue]
	},
	{
		value: true,
		type: [isValue]
	},
	{
		value: false,
		type: [isValue]
	},
	{
		value: 'true',
		type: [isString, isValue]
	},
	{
		value: 'false',
		type: [isString, isValue]
	},
	{
		value: [],
		type: [isValue]
	},
	{
		value: '[]',
		type: [isString, isValue]
	},
	{
		value: [1, 2, 3],
		type: [isValue]
	},
	{
		value: () => {
		},
		type: [isValue]
	},
	{
		value: { dummyObject: 0 },
		type: [isObject, isValue]
	},
	{
		value: {},
		type: [isObject, isEmptyObject, isValue]
	},
	{
		value: '{}',
		type: [isString, isValue]
	},
	{
		value: 'null',
		type: [isString, isValue]
	},
	{
		value: 'undefined',
		type: [isString, isValue]
	},
];

var checkVariables = (fnc) => {
	variableCheckMap.forEach(value => {
		var expectedVal = value.type.indexOf(fnc) !== -1;
		var val = fnc(value.value);
		assert.equal(val, expectedVal, 'Exception for value ' + util.inspect(value.value, { showHidden: false, depth: null }));
	});
};

describe('helpers/variableType', function () {

	it('should be correctly specify string type', function () {
		checkVariables(isString);
	});

	it('should be correctly specify number type', function () {
		checkVariables(isNumber);
	});

	it('should be correctly specify object', function () {
		checkVariables(isObject);
	});

	it('should be correctly specify variable with value', function () {
		checkVariables(isValue);
	});

});
