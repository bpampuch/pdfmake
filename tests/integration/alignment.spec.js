'use strict';

var assert = require('assert');
var sizes = require('../../js/standardPageSizes').default;
var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: alignment', function () {

	var testHelper = new integrationTestHelper();

	it('renders text right aligned', function () {

		var dd = {
			content: [
				{
					text: 'Left aligned before',
					alignment: 'left'
				},
				{
					text: 'Right aligned',
					alignment: 'right'
				},
				{
					text: 'Left aligned after',
					alignment: 'left'
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var itemLeftBefore = pages[0].items[0].item;
		assert.equal(itemLeftBefore.x, testHelper.MARGINS.left);
		assert.equal(itemLeftBefore.y, testHelper.MARGINS.top);

		var itemRight = pages[0].items[1].item;
		assert.equal(itemRight.x, sizes.A6[0] - testHelper.MARGINS.right - testHelper.getWidthOfString('Right aligned'));
		assert.equal(itemRight.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);

		var itemLeftAfter = pages[0].items[2].item;
		assert.equal(itemLeftAfter.x, testHelper.MARGINS.left);
		assert.equal(itemLeftAfter.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);
	});

	it('renders text center aligned', function () {

		var dd = {
			content: [
				{
					text: 'Left aligned before',
					alignment: 'left'
				},
				{
					text: 'Right aligned',
					alignment: 'center'
				},
				{
					text: 'Left aligned after',
					alignment: 'left'
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var itemLeftBefore = pages[0].items[0].item;
		assert.equal(itemLeftBefore.x, testHelper.MARGINS.left);
		assert.equal(itemLeftBefore.y, testHelper.MARGINS.top);

		var itemCenter = pages[0].items[1].item;
		assert.equal(itemCenter.x, sizes.A6[0] / 2 - testHelper.getWidthOfString('Right aligned') / 2);
		assert.equal(itemCenter.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);

		var itemLeftAfter = pages[0].items[2].item;
		assert.equal(itemLeftAfter.x, testHelper.MARGINS.left);
		assert.equal(itemLeftAfter.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);
	});

	it('renders text justify aligned', function () {

		var dd = {
			content: [
				{
					text: 'Left aligned before',
					alignment: 'left'
				},
				{
					text: 'I\'m not sure yet if this is the_desired_behavior. I find it a better.',
					alignment: 'justify'
				},
				{
					text: 'Left aligned after',
					alignment: 'left'
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var itemLeftBefore = pages[0].items[0].item;
		assert.equal(itemLeftBefore.x, testHelper.MARGINS.left);
		assert.equal(itemLeftBefore.y, testHelper.MARGINS.top);

		var itemJustify1 = pages[0].items[1].item;
		assert.equal(itemJustify1.x, testHelper.MARGINS.left);
		assert.equal(itemJustify1.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);

		var availablePageWidth = sizes.A6[0] - testHelper.MARGINS.left - testHelper.MARGINS.right;
		var endOfLastItem = itemJustify1.inlines[itemJustify1.inlines.length - 1].x + testHelper.getWidthOfString('is');
		assert.equal(endOfLastItem, availablePageWidth);

		var itemJustify2 = pages[0].items[2].item;
		assert.equal(itemJustify2.x, testHelper.MARGINS.left);
		assert.equal(itemJustify2.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);
		assert.equal(itemJustify2.inlineWidths, testHelper.getWidthOfString('the_desired_behavior. I find it a better.'));

		var itemLeftAfter = pages[0].items[3].item;
		assert.equal(itemLeftAfter.x, testHelper.MARGINS.left);
		assert.equal(itemLeftAfter.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 3);
	});

});
