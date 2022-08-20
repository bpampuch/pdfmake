const assert = require('assert');

const { isFunction } = require('../../js/helpers/variableType');
const { normalizePageMargin, functionalizePageMargin } = require('../../js/PageSize');

describe('PageSize normalizePageMargin', function () {
	describe('normalizePageMargin', function () {
		it('should accept pageMargin as number', function () {
			const margin = normalizePageMargin(10);
			assert.deepEqual(margin, {
				left: 10,
				top: 10,
				right: 10,
				bottom: 10,
			});
		});

		it('should accept pageMargin as Array of two numbers', function () {
			const margin = normalizePageMargin([10, 20]);
			assert.deepEqual(margin, {
				left: 10,
				top: 20,
				right: 10,
				bottom: 20,
			});
		});

		it('should throw Error for pageMargin as Array of three numbers', function () {
			assert.throws(() => normalizePageMargin([10, 20, 30]), Error);
		});

		it('should accept pageMargin as Array of four numbers', function () {
			const margin = normalizePageMargin([10, 20, 30, 40]);
			assert.deepEqual(margin, {
				left: 10,
				top: 20,
				right: 30,
				bottom: 40,
			});
		});

		it('should throw Error for pageMargin as Array of five numbers', function () {
			assert.throws(() => normalizePageMargin([10, 20, 30, 40, 50]), Error);
		});

		it('should accept pageMargin as Object with all properties', function () {
			const marginObject = {
				left: 10,
				top: 20,
				right: 30,
				bottom: 40,
			};
			const margin = normalizePageMargin(marginObject);
			assert.deepEqual(margin, marginObject);
		});

		it('should refuse pageMargin as Object missing left property', function () {
			const marginObject = {
				top: 20,
				right: 30,
				bottom: 40,
			};
			assert.throws(() => normalizePageMargin(marginObject), Error);
		});

		it('should refuse pageMargin as Object missing top property', function () {
			const marginObject = {
				left: 10,
				right: 30,
				bottom: 40,
			};
			assert.throws(() => normalizePageMargin(marginObject), Error);
		});

		it('should refuse pageMargin as Object missing right property', function () {
			const marginObject = {
				left: 10,
				top: 20,
				bottom: 40,
			};
			assert.throws(() => normalizePageMargin(marginObject), Error);
		});

		it('should refuse pageMargin as Object missing bottom property', function () {
			const marginObject = {
				left: 10,
				top: 20,
				right: 30,
			};
			assert.throws(() => normalizePageMargin(marginObject), Error);
		});

		it('should accept pageMargin as Function', function () {
			const margin = normalizePageMargin(() => [10, 20]);
			assert.ok(isFunction(margin));
			assert.deepEqual(margin(), [10, 20]);
		});
	});

	describe('functionalizePageMargin', function () {
		it('should transform when pageMargin is a Number', function () {
			const marginFn = functionalizePageMargin(10);
			assert.ok(isFunction(marginFn));
			assert.deepEqual(marginFn(1), {
				left: 10,
				top: 10,
				right: 10,
				bottom: 10,
			});
		});

		it('should transform when pageMargin is an Array', function () {
			const marginFn = functionalizePageMargin([10, 20]);
			assert.ok(isFunction(marginFn));
			assert.deepEqual(marginFn(1), {
				left: 10,
				top: 20,
				right: 10,
				bottom: 20,
			});
		});

		it('should transform when pageMargin is an Object', function () {
			const marginObject = { left: 10, top: 20, right: 30, bottom: 40 };
			const marginFn = functionalizePageMargin(marginObject);
			assert.ok(isFunction(marginFn));
			assert.deepEqual(marginFn(1), marginObject);
		});

		it('should transform when pageMargin is a Function', function () {
			const marginObject = { left: 10, top: 20, right: 30, bottom: 40 };
			function userMarginFn() {
				return marginObject;
			}

			const marginFn = functionalizePageMargin(userMarginFn);
			assert.ok(isFunction(marginFn));
			assert.deepEqual(marginFn(1), marginObject);
		});
	});
});
