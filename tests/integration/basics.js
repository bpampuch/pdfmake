var assert = require('assert');
var _ = require('lodash');
var sizes = require('../../src/standardPageSizes');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: basics', function () {

	var testHelper = new integrationTestHelper();

	it('renders text on page', function () {
		var pages = testHelper.renderPages('A7', {
			content: [
				'First paragraph',
				'Second paragraph on three lines because it is longer'
			]
		});

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 4);
		assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'x'), [testHelper.MARGINS.left, testHelper.MARGINS.left, testHelper.MARGINS.left, testHelper.MARGINS.left]);
		assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'y'), [testHelper.MARGINS.top, testHelper.MARGINS.top + testHelper.LINE_HEIGHT, testHelper.MARGINS.top + 2 * testHelper.LINE_HEIGHT, testHelper.MARGINS.top + 3 * testHelper.LINE_HEIGHT]);
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 0}), ['First ', 'paragraph']);
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 1}), ['Second ', 'paragraph ', 'on ']);
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 2}), ['three ', 'lines ', 'because ', 'it ', 'is ']);
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 3}), ['longer']);
	});

	it('renders text with margin', function () {
		var customMargin = 10;
		var anotherCustomMargin = 13;
		var dd = {
			content: [
				{text: 'has margin', margin: customMargin},
				{text: 'has only top/bottom margin', margin: [0, customMargin]},
				{
					text: 'has single set margin',
					margin: [anotherCustomMargin, anotherCustomMargin, anotherCustomMargin, anotherCustomMargin]
				},
				{text: 'has only right margin', alignment: 'right', marginRight: 20}
			]
		};

		var pages = testHelper.renderPages('A5', dd);

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items[0].item.x, testHelper.MARGINS.left + customMargin);
		assert.equal(pages[0].items[0].item.y, testHelper.MARGINS.top + customMargin);

		assert.equal(pages[0].items[1].item.x, testHelper.MARGINS.left);
		assert.equal(pages[0].items[1].item.y, testHelper.MARGINS.top + customMargin * 3 + testHelper.LINE_HEIGHT);

		assert.equal(pages[0].items[2].item.x, testHelper.MARGINS.left + anotherCustomMargin);
		assert.equal(pages[0].items[2].item.y.toFixed(3), testHelper.MARGINS.top + customMargin * 4 + anotherCustomMargin + testHelper.LINE_HEIGHT * 2);

		assert.equal(pages[0].items[3].item.x, sizes.A5[0] - testHelper.MARGINS.right - 20 - testHelper.getWidthOfString('has only right margin'));
		assert.equal(pages[0].items[3].item.y.toFixed(3), testHelper.MARGINS.top + customMargin * 4 + anotherCustomMargin * 2 + testHelper.LINE_HEIGHT * 3);
	});

});
