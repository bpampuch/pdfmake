var assert = require('assert');
var _ = require('lodash');
var sizes = require('../../src/standardPageSizes');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: columns', function () {

	var testHelper = new integrationTestHelper();

	it('renders two columns', function () {
		var dd = {
			content: [
				{
					alignment: 'justify',
					columns: [
						'Lorem ipsum Malit profecta versatur',
						'and alta adipisicing elit Malit profecta versatur'
					]
				}
			],
			defaultStyle: {
				columnGap: 1
			}
		};
		var pages = testHelper.renderPages('A5', dd);

		var columnCount = 2,
			columnSpacing = (sizes.A5[0] + dd.defaultStyle.columnGap) / columnCount;

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 4);
		assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'x'), [testHelper.MARGINS.left, testHelper.MARGINS.left, columnSpacing, columnSpacing]);
		assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'y'), [testHelper.MARGINS.top, testHelper.MARGINS.top + testHelper.LINE_HEIGHT, testHelper.MARGINS.top, testHelper.MARGINS.top + testHelper.LINE_HEIGHT]);
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 0}).join(''), 'Lorem ipsum Malit profecta ');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 1}).join(''), 'versatur');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 2}).join(''), 'and alta adipisicing elit Malit ');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 3}).join(''), 'profecta versatur');
	});

	it('renders three columns', function () {
		var dd = {
			content: [
				{
					columns: [
						'dolor sit amet',
						'Diu concederetur.',
						'dolor sit amet'
					]
				}
			],
			defaultStyle: {
				columnGap: 1
			}
		};

		var pages = testHelper.renderPages('A5', dd);

		var columnCount = 3,
			columnSpacing = (sizes.A5[0] - (testHelper.MARGINS.left + testHelper.MARGINS.right) + dd.defaultStyle.columnGap) / columnCount;


		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 3);
		assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'x'), [testHelper.MARGINS.left, testHelper.MARGINS.left + columnSpacing, testHelper.MARGINS.left + 2 * columnSpacing]);
		assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'y'), [testHelper.MARGINS.top, testHelper.MARGINS.top, testHelper.MARGINS.top]);
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 0}).join(''), 'dolor sit amet');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 1}).join(''), 'Diu concederetur.');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 2}).join(''), 'dolor sit amet');
	});

	it('renders star column', function () {
		var dd = {
			content: [
				{
					columns: [
						{
							width: 90,
							text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.'
						},
						{
							width: '*',
							text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.'
						}
					]
				}
			],
			defaultStyle: {
				columnGap: 1
			}
		};

		var pages = testHelper.renderPages('A5', dd);

		var leftColumnSpacing = testHelper.MARGINS.left,
			definedWidth = dd.content[0].columns[0].width,
			rightColumnSpacing = testHelper.MARGINS.left + definedWidth + dd.defaultStyle.columnGap,
			starWidth = sizes.A5[0] - (testHelper.MARGINS.left + testHelper.MARGINS.right) - dd.defaultStyle.columnGap - definedWidth;


		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 6);
		var items = _.map(pages[0].items, 'item');
		assert.deepEqual(_.map(items, 'x'), [
			leftColumnSpacing, leftColumnSpacing, leftColumnSpacing, leftColumnSpacing,
			rightColumnSpacing, rightColumnSpacing
		]);
		assert.deepEqual(_.map(items, 'y'), [
			testHelper.MARGINS.top, testHelper.MARGINS.top + testHelper.LINE_HEIGHT, testHelper.MARGINS.top + 2 * testHelper.LINE_HEIGHT, testHelper.MARGINS.top + 3 * testHelper.LINE_HEIGHT,
			testHelper.MARGINS.top, testHelper.MARGINS.top + testHelper.LINE_HEIGHT
		]);
		assert.deepEqual(_.map(items, 'maxWidth'), [
			definedWidth, definedWidth, definedWidth, definedWidth,
			starWidth, starWidth
		]);
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 0}).join(''), 'Lorem ipsum ');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 1}).join(''), 'dolor sit amet, ');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 2}).join(''), 'consectetur ');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 3}).join(''), 'adipisicing elit.');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 4}).join(''), 'Lorem ipsum dolor sit amet, consectetur ');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 5}).join(''), 'adipisicing elit.');
	});

	it('renders auto column', function () {
		var dd = {
			content: [
				{
					columns: [
						{
							width: 'auto',
							text: 'auto column'
						},
						{
							width: '*',
							text: 'This is a star-sized column. It should get the remaining space divided by the number'
						},
						{
							width: 50,
							text: 'this one'
						}
					]
				}
			],
			defaultStyle: {
				columnGap: 1
			}
		};

		var pages = testHelper.renderPages('A5', dd);
		var items = _.map(pages[0].items, 'item');

		var definedWidth = dd.content[0].columns[2].width,
			autoColumnSpacing = testHelper.MARGINS.left,
			fixedColumnSpacing = sizes.A5[0] - testHelper.MARGINS.right - definedWidth,
			autoWidth = _.chain(items).take(2).map('maxWidth').max().value(),
			starWidth = sizes.A5[0] - (testHelper.MARGINS.left + testHelper.MARGINS.right) - 2 * dd.defaultStyle.columnGap - definedWidth - autoWidth,
			starColumnSpacing = autoColumnSpacing + autoWidth + dd.defaultStyle.columnGap;


		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 5);
		assert.deepEqual(_.map(items, 'x'), [
			autoColumnSpacing, autoColumnSpacing,
			starColumnSpacing, starColumnSpacing,
			fixedColumnSpacing
		]);
		assert.deepEqual(_.map(items, 'y'), [
			testHelper.MARGINS.top, testHelper.MARGINS.top + testHelper.LINE_HEIGHT,
			testHelper.MARGINS.top, testHelper.MARGINS.top + testHelper.LINE_HEIGHT,
			testHelper.MARGINS.top
		]);
		assert.deepEqual(_.map(items, 'maxWidth'), [
			autoWidth, autoWidth,
			starWidth, starWidth,
			definedWidth
		]);
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 0}).join(''), 'auto ');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 1}).join(''), 'column');
		assert.deepEqual(testHelper.getInlineTexts(pages, {
			page: 0,
			item: 2
		}).join(''), 'This is a star-sized column. It should get ');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 3}).join(''), 'the remaining space divided by the number');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 4}).join(''), 'this one');
	});

	it('renders only needed space for auto columns', function () {
		var dd = {
			content: [
				{
					columns: [
						{
							width: 'auto',
							text: 'val'
						},
						{
							width: 'auto',
							text: 'val'
						}
					]
				}
			],
			defaultStyle: {
				columnGap: 1
			}
		};

		var pages = testHelper.renderPages('A5', dd);
		var items = _.map(pages[0].items, 'item');

		var autoWidth = _.chain(items).take(2).map('maxWidth').max().value(),
			leftColumnSpacing = testHelper.MARGINS.left,
			rightColumnSpacing = leftColumnSpacing + autoWidth + dd.defaultStyle.columnGap;

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 2);
		assert.deepEqual(_.map(items, 'x'), [leftColumnSpacing, rightColumnSpacing]);
		assert.deepEqual(_.map(items, 'y'), [testHelper.MARGINS.top, testHelper.MARGINS.top]);

		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 0}).join(''), 'val');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 1}).join(''), 'val');
	});

	it('render nested columns', function () {
		var dd = {
			content: [
				{
					columns: [
						{
							width: 100,
							text: 'Lorem ipsum dolor sit amet'
						},
						{
							columns: [
								'Lorem ipsum',
								'Lorem ipsum',
								'Lorem ipsum'
							]
						}
					]
				}
			],
			defaultStyle: {
				columnGap: 1
			}
		};

		var pages = testHelper.renderPages('A5', dd);
		var items = _.map(pages[0].items, 'item');

		var gap = dd.defaultStyle.columnGap;
		var loremIpsumWidth = _.chain(items).takeRight(3).map('maxWidth').max().value(),
			definedWidth = dd.content[0].columns[0].width,
			leftColumnSpacing = testHelper.MARGINS.left,
			rightColumnSpacing = leftColumnSpacing + definedWidth + gap;

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 5);
		assert.deepEqual(_.map(items, 'x'), [
			leftColumnSpacing, leftColumnSpacing,
			rightColumnSpacing, rightColumnSpacing + (gap + loremIpsumWidth), rightColumnSpacing + 2 * (gap + loremIpsumWidth)
		]);
		assert.deepEqual(_.map(items, 'y'), [testHelper.MARGINS.top, testHelper.MARGINS.top + testHelper.LINE_HEIGHT, testHelper.MARGINS.top, testHelper.MARGINS.top, testHelper.MARGINS.top]);

		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 0}).join(''), 'Lorem ipsum ');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 1}).join(''), 'dolor sit amet');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 2}).join(''), 'Lorem ipsum');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 3}).join(''), 'Lorem ipsum');
		assert.deepEqual(testHelper.getInlineTexts(pages, {page: 0, item: 4}).join(''), 'Lorem ipsum');
	});

});
