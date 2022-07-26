'use strict';

var assert = require('assert');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: pageMargins', function () {
	it('margins values with function using different values for even and odd pages', function () {
		function marginFn(pageNumber) {
			if (pageNumber % 2 === 0) {
				return 10;
			}
			return [20, 30];
		}

		var testHelper = new integrationTestHelper({ margins: marginFn });

		var pages = testHelper.renderPages('A7', {
			content: [
				{ text: 'First page', pageBreak: 'after' },
				{ text: 'Second page', pageBreak: 'after' },
				{ text: 'Third page', pageBreak: 'after' },
				{ text: 'Fourth page'},
			]
		});

		assert.equal(pages.length, 4);
		assert.deepEqual(pages[0].pageMargins, { left: 20, right: 20, top: 30, bottom: 30 });
		assert.deepEqual(pages[1].pageMargins, { left: 10, right: 10, top: 10, bottom: 10 });
		assert.deepEqual(pages[2].pageMargins, { left: 20, right: 20, top: 30, bottom: 30 });
		assert.deepEqual(pages[3].pageMargins, { left: 10, right: 10, top: 10, bottom: 10 });
	});

	it('margins values when function use dynamic left value', function () {
		function marginFn(pageNumber) {
			return [(pageNumber %2 === 0) ? 0 : 20, 30, 30, 30];
		}

		var testHelper = new integrationTestHelper({ margins: marginFn });

		var pages = testHelper.renderPages('A7', {
			content: [
				{ text: 'First page', pageBreak: 'after' },
				{ text: 'Second page', pageBreak: 'after' },
				{ text: 'Third page', pageBreak: 'after' },
				{ text: 'Fourth page'},
			]
		});

		assert.equal(pages.length, 4);
		assert.deepEqual(pages[0].pageMargins, { left: 20, right: 30, top: 30, bottom: 30 });
		assert.deepEqual(pages[1].pageMargins, { left: 0, right: 30, top: 30, bottom: 30 });
		assert.deepEqual(pages[2].pageMargins, { left: 20, right: 30, top: 30, bottom: 30 });
		assert.deepEqual(pages[3].pageMargins, { left: 0, right: 30, top: 30, bottom: 30 });
	});

	it('margins values when function use dynamic top value', function () {
		function marginFn(pageNumber) {
			return [30, (pageNumber % 2 === 0) ? 0 : 20, 30, 30];
		}

		var testHelper = new integrationTestHelper({ margins: marginFn });

		var pages = testHelper.renderPages('A7', {
			content: [
				{ text: 'First page', pageBreak: 'after' },
				{ text: 'Second page', pageBreak: 'after' },
				{ text: 'Third page', pageBreak: 'after' },
				{ text: 'Fourth page'},
			]
		});

		assert.equal(pages.length, 4);
		assert.deepEqual(pages[0].pageMargins, { left: 30, right: 30, top: 20, bottom: 30 });
		assert.deepEqual(pages[1].pageMargins, { left: 30, right: 30, top: 0, bottom: 30 });
		assert.deepEqual(pages[2].pageMargins, { left: 30, right: 30, top: 20, bottom: 30 });
		assert.deepEqual(pages[3].pageMargins, { left: 30, right: 30, top: 0, bottom: 30 });
	});

	it('margins values when function use dynamic horizontal value', function () {
		function marginFn(pageNumber) {
			return [(pageNumber %2 === 0) ? 0 : 20, 30];
		}

		var testHelper = new integrationTestHelper({ margins: marginFn });

		var pages = testHelper.renderPages('A7', {
			content: [
				{ text: 'First page', pageBreak: 'after' },
				{ text: 'Second page', pageBreak: 'after' },
				{ text: 'Third page', pageBreak: 'after' },
				{ text: 'Fourth page'},
			]
		});

		assert.equal(pages.length, 4);
		assert.deepEqual(pages[0].pageMargins, { left: 20, right: 20, top: 30, bottom: 30 });
		assert.deepEqual(pages[1].pageMargins, { left: 0, right: 0, top: 30, bottom: 30 });
		assert.deepEqual(pages[2].pageMargins, { left: 20, right: 20, top: 30, bottom: 30 });
		assert.deepEqual(pages[3].pageMargins, { left: 0, right: 0, top: 30, bottom: 30 });
	});

	it('margins values when function use dynamic vertical value', function () {
		function marginFn(pageNumber) {
			return [20, (pageNumber %2 === 0) ? 0 : 30];
		}

		var testHelper = new integrationTestHelper({ margins: marginFn });

		var pages = testHelper.renderPages('A7', {
			content: [
				{ text: 'First page', pageBreak: 'after' },
				{ text: 'Second page', pageBreak: 'after' },
				{ text: 'Third page', pageBreak: 'after' },
				{ text: 'Fourth page'},
			]
		});

		assert.equal(pages.length, 4);
		assert.deepEqual(pages[0].pageMargins, { left: 20, right: 20, top: 30, bottom: 30 });
		assert.deepEqual(pages[1].pageMargins, { left: 20, right: 20, top: 0, bottom: 0 });
		assert.deepEqual(pages[2].pageMargins, { left: 20, right: 20, top: 30, bottom: 30 });
		assert.deepEqual(pages[3].pageMargins, { left: 20, right: 20, top: 0, bottom: 0 });
	});
});
