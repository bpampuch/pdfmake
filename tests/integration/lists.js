var assert = require('assert');
var _ = require('lodash');
var sizes = require('../../src/standardPageSizes');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: lists', function () {

	var testHelper = new integrationTestHelper();

	function getBulletListLine(pages, options) {
		options.itemNumber = options.itemNumber || 1;

		var bullet = pages[options.pageNumber].items[options.itemNumber * 2 - 1];
		var content = pages[options.pageNumber].items[options.itemNumber * 2 - 2];

		return {
			bullet: bullet && bullet.item,
			content: content && content.item
		}
	}

	it('renders a ordered list', function () {
		var dd = {
			content: {
				ol: [
					'item 1',
					'item 2',
					'item 3 - Paleo American Apparel forage whatever.'
				]
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 1});
		assert.equal(_.map(item1.content.inlines, 'text').join(''), 'item 1');
		assert.equal(_.map(item1.bullet.inlines, 'text').join(''), '1. ');

		assert.equal(item1.bullet.x, testHelper.MARGINS.left);
		assert.equal(item1.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('1. '));
		assert.equal(item1.bullet.y, testHelper.MARGINS.top);
		assert.equal(item1.content.y, testHelper.MARGINS.top);

		var item2 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 2});
		assert.equal(_.map(item2.content.inlines, 'text').join(''), 'item 2');
		assert.equal(_.map(item2.bullet.inlines, 'text').join(''), '2. ');

		assert.equal(item2.bullet.x, testHelper.MARGINS.left);
		assert.equal(item2.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('2. '));
		assert.equal(item2.bullet.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);
		assert.equal(item2.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);

		var item3 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 3});
		assert.equal(_.map(item3.content.inlines, 'text').join(''), 'item 3 - Paleo American Apparel ');
		assert.equal(_.map(item3.bullet.inlines, 'text').join(''), '3. ');

		assert.equal(item3.bullet.x, testHelper.MARGINS.left);
		assert.equal(item3.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('3. '));
		assert.equal(item3.bullet.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);
		assert.equal(item3.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);

		var item4 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 4});
		assert.equal(_.map(item4.content.inlines, 'text').join(''), 'forage whatever.');
		assert.equal(item4.bullet, undefined);

		assert.equal(item4.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));
		assert.equal(item4.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 3);
	});

	it('renders a ordered list and adapts margin to longest list number', function () {
		var dd = {
			content: {
				ol: [
					'item 1',
					'item 2',
					'item 3',
					'item 4',
					'item 5',
					'item 6',
					'item 7',
					'item 8',
					'item 9',
					'item 10'
				]
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 1});
		assert.equal(_.map(item1.content.inlines, 'text').join(''), 'item 1');
		assert.equal(_.map(item1.bullet.inlines, 'text').join(''), '1. ');

		assert.equal(item1.bullet.x, testHelper.MARGINS.left);
		assert.equal(item1.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('10. '));

		var item10 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 10});
		assert.equal(_.map(item10.content.inlines, 'text').join(''), 'item 10');
		assert.equal(_.map(item10.bullet.inlines, 'text').join(''), '10. ');

		assert.equal(item10.bullet.x, testHelper.MARGINS.left);
		assert.equal(item10.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('10. '));
	});

	it('renders a unordered list', function () {
		var dd = {
			content: {
				ul: [
					'item 1',
					'item 2',
					'item 3 - Paleo American Apparel forage whatever.'
				]
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var bulletRadius = 2;
		var bulletMargin = testHelper.MARGINS.left + bulletRadius;

		var item1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 1});
		assert.equal(_.map(item1.content.inlines, 'text').join(''), 'item 1');
		assert.equal(item1.bullet.type, 'ellipse');

		assert.equal(item1.bullet.x, bulletMargin);
		assert.equal(item1.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));
		assert.equal(item1.content.y, testHelper.MARGINS.top);

		var item2 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 2});
		assert.equal(_.map(item2.content.inlines, 'text').join(''), 'item 2');
		assert.equal(item2.bullet.type, 'ellipse');

		assert.equal(item2.bullet.x, bulletMargin);
		assert.equal(item2.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));

		var item3 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 3});
		assert.equal(_.map(item3.content.inlines, 'text').join(''), 'item 3 - Paleo American Apparel ');
		assert.equal(item3.bullet.type, 'ellipse');

		assert.equal(item3.bullet.x, bulletMargin);
		assert.equal(item3.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));
		assert.equal(item3.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);

		var item4 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 4});
		assert.equal(_.map(item4.content.inlines, 'text').join(''), 'forage whatever.');
		assert.equal(item4.bullet, undefined);

		assert.equal(item4.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));
		assert.equal(item4.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 3);
	});

	it('renders a unordered list and keeps constant small margin', function () {
		var dd = {
			content: {
				ul: [
					'item 1',
					'item 2',
					'item 3',
					'item 4',
					'item 5',
					'item 6',
					'item 7',
					'item 8',
					'item 9',
					'item 10'
				]
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var bulletRadius = 2;
		var bulletMargin = testHelper.MARGINS.left + bulletRadius;

		var item1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 1});
		assert.equal(_.map(item1.content.inlines, 'text').join(''), 'item 1');

		assert.equal(item1.bullet.x, bulletMargin);
		assert.equal(item1.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));

		var item10 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 10});
		assert.equal(_.map(item10.content.inlines, 'text').join(''), 'item 10');

		assert.equal(item10.bullet.x, bulletMargin);
		assert.equal(item10.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));
	});

	it('renders nested lists', function () {
		var dd = {
			content: {
				ol: [
					'item 1',
					[
						'item 2',
						{ol: ['subitem 1', 'subitem 2']}
					],
					'item 3'
				]
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 1});
		assert.equal(_.map(item1.content.inlines, 'text').join(''), 'item 1');
		assert.equal(_.map(item1.bullet.inlines, 'text').join(''), '1. ');

		assert.equal(item1.bullet.x, testHelper.MARGINS.left);
		assert.equal(item1.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('1. '));

		var item2 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 2});
		assert.equal(_.map(item2.content.inlines, 'text').join(''), 'item 2');
		assert.equal(_.map(item2.bullet.inlines, 'text').join(''), '2. ');

		var item2BulletSpacing = testHelper.MARGINS.left + testHelper.getWidthOfString('2. ');
		assert.equal(item2.bullet.x, testHelper.MARGINS.left);
		assert.equal(item2.content.x, item2BulletSpacing);

		var subItem1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 3});
		assert.equal(_.map(subItem1.content.inlines, 'text').join(''), 'subitem 1');
		assert.equal(_.map(subItem1.bullet.inlines, 'text').join(''), '1. ');

		assert.equal(subItem1.bullet.x, item2BulletSpacing);
		assert.equal(subItem1.content.x, item2BulletSpacing + testHelper.getWidthOfString('1. '));
		assert.equal(subItem1.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);

		var subItem2 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 4});
		assert.equal(_.map(subItem2.content.inlines, 'text').join(''), 'subitem 2');
		assert.equal(_.map(subItem2.bullet.inlines, 'text').join(''), '2. ');

		assert.equal(subItem2.bullet.x, item2BulletSpacing);
		assert.equal(subItem2.content.x, item2BulletSpacing + testHelper.getWidthOfString('2. '));

		var item3 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 5});
		assert.equal(_.map(item3.content.inlines, 'text').join(''), 'item 3');
		assert.equal(_.map(item3.bullet.inlines, 'text').join(''), '3. ');

		var item3BulletSpacing = testHelper.MARGINS.left + testHelper.getWidthOfString('3. ');
		assert.equal(item3.bullet.x, testHelper.MARGINS.left);
		assert.equal(item3.content.x, item3BulletSpacing);
		assert.equal(item3.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 4);
	});

});
