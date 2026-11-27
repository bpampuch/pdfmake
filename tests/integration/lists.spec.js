'use strict';

var assert = require('assert');

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
		};
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

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '1. ');

		assert.equal(item1.bullet.x, testHelper.MARGINS.left);
		assert.equal(item1.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('1. '));
		assert.equal(item1.bullet.y, testHelper.MARGINS.top);
		assert.equal(item1.content.y, testHelper.MARGINS.top);

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), '2. ');

		assert.equal(item2.bullet.x, testHelper.MARGINS.left);
		assert.equal(item2.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('2. '));
		assert.equal(item2.bullet.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);
		assert.equal(item2.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 3 - Paleo American Apparel ');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), '3. ');

		assert.equal(item3.bullet.x, testHelper.MARGINS.left);
		assert.equal(item3.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('3. '));
		assert.equal(item3.bullet.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);
		assert.equal(item3.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'forage whatever.');
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

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '1. ');

		assert.equal(item1.bullet.x, testHelper.MARGINS.left);
		assert.equal(item1.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('10. '));

		var item10 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 10 });
		assert.equal(item10.content.inlines.map(inline => inline.text).join(''), 'item 10');
		assert.equal(item10.bullet.inlines.map(inline => inline.text).join(''), '10. ');

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

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.type, 'ellipse');

		assert.equal(item1.bullet.x, bulletMargin);
		assert.equal(item1.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));
		assert.equal(item1.content.y, testHelper.MARGINS.top);

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item2.bullet.type, 'ellipse');

		assert.equal(item2.bullet.x, bulletMargin);
		assert.equal(item2.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 3 - Paleo American Apparel ');
		assert.equal(item3.bullet.type, 'ellipse');

		assert.equal(item3.bullet.x, bulletMargin);
		assert.equal(item3.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));
		assert.equal(item3.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'forage whatever.');
		assert.equal(item4.bullet, undefined);

		assert.equal(item4.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));
		assert.equal(item4.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 3);
	});

	it('keeps the markers of a unordered list next to its aligned content', function () {
		var leftPages = testHelper.renderPages('A6', { content: { ul: ['item 1', 'item 2'] } });
		var leftItem1 = getBulletListLine(leftPages, { pageNumber: 0, itemNumber: 1 });

		['center', 'right'].forEach(function (alignment) {
			var pages = testHelper.renderPages('A6', { content: { ul: ['item 1', 'item 2'], alignment: alignment } });
			var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
			var contentShift = item1.content.x - leftItem1.content.x;

			assert.ok(contentShift > 0, alignment + ': the content is shifted');
			assert.equal(item1.content.y, leftItem1.content.y);
			assert.equal(item1.bullet.x - leftItem1.bullet.x, contentShift);
		});
	});

	it('keeps the markers of a ordered list next to its aligned content', function () {
		var leftPages = testHelper.renderPages('A6', { content: { ol: ['item 1', 'item 2'] } });
		var leftItem1 = getBulletListLine(leftPages, { pageNumber: 0, itemNumber: 1 });

		['center', 'right'].forEach(function (alignment) {
			var pages = testHelper.renderPages('A6', { content: { ol: ['item 1', 'item 2'], alignment: alignment } });
			var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
			var contentShift = item1.content.x - leftItem1.content.x;

			assert.ok(contentShift > 0, alignment + ': the content is shifted');
			assert.equal(item1.content.y, leftItem1.content.y);
			assert.equal(item1.bullet.x - leftItem1.bullet.x, contentShift);
		});
	});

	it('keeps outer and inner markers of nested lists inside stack aligned across alignments', function () {
		var outerNumberWidth = testHelper.getWidthOfString('1. ');
		var bulletSpacerWidth = testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER);
		var bulletRadius = 2;

		['left', 'center', 'right'].forEach(function (alignment) {
			var olUlPages = testHelper.renderPages('A4', {
				content: {
					ol: [{ stack: [{ ul: ['Inner item 1', 'Inner item 2'] }] }],
					alignment: alignment
				}
			});
			var olUlItems = olUlPages[0].items;
			var olUlInner1 = olUlItems[0].item;
			var olUlOuterMarker = olUlItems[1].item;
			var olUlInnerBullet1 = olUlItems[2].item;
			var olUlInner2 = olUlItems[3].item;
			var olUlInnerBullet2 = olUlItems[4].item;

			assert.equal(olUlInner1.inlines.map(inline => inline.text).join(''), 'Inner item 1');
			assert.equal(olUlOuterMarker.inlines.map(inline => inline.text).join(''), '1. ');
			assert.equal(olUlInnerBullet1.type, 'ellipse');
			assert.equal(olUlInner2.inlines.map(inline => inline.text).join(''), 'Inner item 2');
			assert.equal(olUlInnerBullet2.type, 'ellipse');

			assert.ok(Math.abs((olUlInner1.x - olUlInnerBullet1.x) - (bulletSpacerWidth - bulletRadius)) < 1e-6);
			assert.ok(Math.abs((olUlInner1.x - olUlOuterMarker.x) - (bulletSpacerWidth + outerNumberWidth)) < 1e-6);
			assert.ok(Math.abs(olUlInnerBullet2.x - olUlInnerBullet1.x) < 1e-6);

			var ulOlPages = testHelper.renderPages('A4', {
				content: {
					ul: [{ stack: [{ ol: ['Inner item 1', 'Inner item 2'] }] }],
					alignment: alignment
				}
			});
			var ulOlItems = ulOlPages[0].items;
			var ulOlInner1 = ulOlItems[0].item;
			var ulOlOuterBullet = ulOlItems[1].item;
			var ulOlInnerMarker1 = ulOlItems[2].item;
			var ulOlInner2 = ulOlItems[3].item;
			var ulOlInnerMarker2 = ulOlItems[4].item;

			assert.equal(ulOlInner1.inlines.map(inline => inline.text).join(''), 'Inner item 1');
			assert.equal(ulOlOuterBullet.type, 'ellipse');
			assert.equal(ulOlInnerMarker1.inlines.map(inline => inline.text).join(''), '1. ');
			assert.equal(ulOlInner2.inlines.map(inline => inline.text).join(''), 'Inner item 2');
			assert.equal(ulOlInnerMarker2.inlines.map(inline => inline.text).join(''), '2. ');

			assert.ok(Math.abs((ulOlInner1.x - ulOlInnerMarker1.x) - outerNumberWidth) < 1e-6);
			assert.ok(Math.abs((ulOlInner1.x - ulOlOuterBullet.x) - (outerNumberWidth + bulletSpacerWidth - bulletRadius)) < 1e-6);
			assert.ok(Math.abs(ulOlInnerMarker2.x - ulOlInnerMarker1.x) < 1e-6);
		});
	});

	it('keeps outer and inner markers aligned in unbreakable nested lists', function () {
		var outerNumberWidth = testHelper.getWidthOfString('1. ');
		var bulletSpacerWidth = testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER);
		var bulletRadius = 2;

		var pages = testHelper.renderPages('A4', {
			content: {
				ol: [{ stack: [{ ul: ['Inner item 1', 'Inner item 2'] }], unbreakable: true }],
				alignment: 'center'
			}
		});
		var items = pages[0].items;
		var inner1 = items[0].item;
		var outerMarker = items[1].item;
		var innerBullet1 = items[2].item;

		assert.equal(inner1.inlines.map(inline => inline.text).join(''), 'Inner item 1');
		assert.equal(outerMarker.inlines.map(inline => inline.text).join(''), '1. ');
		assert.equal(innerBullet1.type, 'ellipse');
		assert.ok(Math.abs((inner1.x - innerBullet1.x) - (bulletSpacerWidth - bulletRadius)) < 1e-6);
		assert.ok(Math.abs((inner1.x - outerMarker.x) - (bulletSpacerWidth + outerNumberWidth)) < 1e-6);
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

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');

		assert.equal(item1.bullet.x, bulletMargin);
		assert.equal(item1.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER));

		var item10 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 10 });
		assert.equal(item10.content.inlines.map(inline => inline.text).join(''), 'item 10');

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
						{ ol: ['subitem 1', 'subitem 2'] }
					],
					'item 3'
				]
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '1. ');

		assert.equal(item1.bullet.x, testHelper.MARGINS.left);
		assert.equal(item1.content.x, testHelper.MARGINS.left + testHelper.getWidthOfString('1. '));

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), '2. ');

		var item2BulletSpacing = testHelper.MARGINS.left + testHelper.getWidthOfString('2. ');
		assert.equal(item2.bullet.x, testHelper.MARGINS.left);
		assert.equal(item2.content.x, item2BulletSpacing);

		var subItem1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(subItem1.content.inlines.map(inline => inline.text).join(''), 'subitem 1');
		assert.equal(subItem1.bullet.inlines.map(inline => inline.text).join(''), '1. ');

		assert.equal(subItem1.bullet.x, item2BulletSpacing);
		assert.equal(subItem1.content.x, item2BulletSpacing + testHelper.getWidthOfString('1. '));
		assert.equal(subItem1.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);

		var subItem2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(subItem2.content.inlines.map(inline => inline.text).join(''), 'subitem 2');
		assert.equal(subItem2.bullet.inlines.map(inline => inline.text).join(''), '2. ');

		assert.equal(subItem2.bullet.x, item2BulletSpacing);
		assert.equal(subItem2.content.x, item2BulletSpacing + testHelper.getWidthOfString('2. '));

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 3');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), '3. ');

		var item3BulletSpacing = testHelper.MARGINS.left + testHelper.getWidthOfString('3. ');
		assert.equal(item3.bullet.x, testHelper.MARGINS.left);
		assert.equal(item3.content.x, item3BulletSpacing);
		assert.equal(item3.content.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 4);
	});

	it('renders a ordered list with start value', function () {
		var dd = {
			content: [
				{
					start: 50,
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '50. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), '54. ');
	});

	it('renders a ordered list with start value zero', function () {
		var dd = {
			content: [
				{
					start: 0,
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '0. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), '4. ');
	});

	it('renders a ordered list with counter values', function () {
		var dd = {
			content: [
				{
					ol: [
						{ text: 'item 1', counter: 0 },
						{ text: 'item 2', counter: 10 },
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '0. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), '10. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), '5. ');
	});

	it('renders a reversed ordered list', function () {
		var dd = {
			content: [
				{
					reversed: true,
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '5. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), '1. ');
	});

	it('renders a ordered list with own separator', function () {
		var dd = {
			content: [
				{
					separator: ')',
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '1) ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), '5) ');
	});

	it('renders a ordered list with own complex separator', function () {
		var dd = {
			content: [
				{
					separator: ['(', ')'],
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '(1) ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), '(5) ');
	});

	it('renders a ordered list with upper-roman style type', function () {
		var dd = {
			content: [
				{
					type: 'upper-roman',
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), 'I. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), 'II. ');

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 3');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), 'III. ');

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'item 4');
		assert.equal(item4.bullet.inlines.map(inline => inline.text).join(''), 'IV. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), 'V. ');
	});

	it('renders a ordered list with lower-roman style type', function () {
		var dd = {
			content: [
				{
					type: 'lower-roman',
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), 'i. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), 'ii. ');

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 3');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), 'iii. ');

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'item 4');
		assert.equal(item4.bullet.inlines.map(inline => inline.text).join(''), 'iv. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), 'v. ');
	});

	it('renders a ordered list with upper-roman style type and check maximum', function () {
		var dd = {
			content: [
				{
					start: 4995,
					type: 'upper-roman',
					ol: [
						'item 4995',
						'item 4996',
						'item 4997',
						'item 4998',
						'item 4999',
						'item 5000',
						'item 5001'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 4995');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), 'MMMMCMXCV. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 4996');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), 'MMMMCMXCVI. ');

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 4997');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), 'MMMMCMXCVII. ');

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'item 4998');
		assert.equal(item4.bullet.inlines.map(inline => inline.text).join(''), 'MMMMCMXCVIII. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 4999');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), 'MMMMCMXCIX. ');

		var item6 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 6 });
		assert.equal(item6.content.inlines.map(inline => inline.text).join(''), 'item 5000');
		assert.equal(item6.bullet.inlines.map(inline => inline.text).join(''), '5000. ');

		var item7 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 7 });
		assert.equal(item7.content.inlines.map(inline => inline.text).join(''), 'item 5001');
		assert.equal(item7.bullet.inlines.map(inline => inline.text).join(''), '5001. ');
	});

	it('renders a ordered list with upper-roman style type and check minimum', function () {
		var dd = {
			content: [
				{
					start: -2,
					type: 'upper-roman',
					ol: [
						'item -2',
						'item -1',
						'item 0',
						'item 1',
						'item 2'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item -2');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '-2. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item -1');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), '-1. ');

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 0');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), '0. ');

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item4.bullet.inlines.map(inline => inline.text).join(''), 'I. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), 'II. ');
	});

	it('renders a ordered list with upper-alpha style type', function () {
		var dd = {
			content: [
				{
					type: 'upper-alpha',
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), 'A. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), 'B. ');

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 3');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), 'C. ');

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'item 4');
		assert.equal(item4.bullet.inlines.map(inline => inline.text).join(''), 'D. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), 'E. ');
	});

	it('renders a ordered list with upper-alpha style type (counter 25 - 29)', function () {
		var dd = {
			content: [
				{
					type: 'upper-alpha',
					start: 25,
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), 'Y. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), 'Z. ');

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 3');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), 'AA. ');

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'item 4');
		assert.equal(item4.bullet.inlines.map(inline => inline.text).join(''), 'AB. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), 'AC. ');
	});

	it('renders a ordered list with upper-alpha style type and check minimum', function () {
		var dd = {
			content: [
				{
					start: -2,
					type: 'upper-alpha',
					ol: [
						'item -2',
						'item -1',
						'item 0',
						'item 1',
						'item 2'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item -2');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '-2. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item -1');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), '-1. ');

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 0');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), '0. ');

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item4.bullet.inlines.map(inline => inline.text).join(''), 'A. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), 'B. ');
	});

	it('renders a ordered list with lower-alpha style type', function () {
		var dd = {
			content: [
				{
					type: 'lower-alpha',
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), 'a. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), 'b. ');

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 3');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), 'c. ');

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'item 4');
		assert.equal(item4.bullet.inlines.map(inline => inline.text).join(''), 'd. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), 'e. ');
	});

	it('renders a ordered list with lower-alpha style type (counter 25 - 29)', function () {
		var dd = {
			content: [
				{
					type: 'lower-alpha',
					start: 25,
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), 'y. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), 'z. ');

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 3');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), 'aa. ');

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'item 4');
		assert.equal(item4.bullet.inlines.map(inline => inline.text).join(''), 'ab. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 5');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), 'ac. ');
	});

	it('renders a ordered list with lower-alpha style type and check minimum', function () {
		var dd = {
			content: [
				{
					start: -2,
					type: 'lower-alpha',
					ol: [
						'item -2',
						'item -1',
						'item 0',
						'item 1',
						'item 2'
					]
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var item1 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 1 });
		assert.equal(item1.content.inlines.map(inline => inline.text).join(''), 'item -2');
		assert.equal(item1.bullet.inlines.map(inline => inline.text).join(''), '-2. ');

		var item2 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 2 });
		assert.equal(item2.content.inlines.map(inline => inline.text).join(''), 'item -1');
		assert.equal(item2.bullet.inlines.map(inline => inline.text).join(''), '-1. ');

		var item3 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 3 });
		assert.equal(item3.content.inlines.map(inline => inline.text).join(''), 'item 0');
		assert.equal(item3.bullet.inlines.map(inline => inline.text).join(''), '0. ');

		var item4 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 4 });
		assert.equal(item4.content.inlines.map(inline => inline.text).join(''), 'item 1');
		assert.equal(item4.bullet.inlines.map(inline => inline.text).join(''), 'a. ');

		var item5 = getBulletListLine(pages, { pageNumber: 0, itemNumber: 5 });
		assert.equal(item5.content.inlines.map(inline => inline.text).join(''), 'item 2');
		assert.equal(item5.bullet.inlines.map(inline => inline.text).join(''), 'b. ');
	});

});
