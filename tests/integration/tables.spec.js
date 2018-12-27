'use strict';

var assert = require('assert');
var sizes = require('../../js/standardPageSizes').default;

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: tables', function () {

	var testHelper = new integrationTestHelper();

	function getColumnText(lines, options) {
		return lines[options.cell].item.inlines.map(inline => inline.text).join('');
	}

	function getCells(pages, options) {
		return pages[options.pageNumber].items.filter(node => node.type === 'line');
	}

	var TABLE_PADDING_X = 4;
	var TABLE_PADDING_Y = 2;

	var TABLE_BORDER_STRENGTH = 1;
	var TABLE_LINE_HEIGHT = 2 * TABLE_PADDING_X + testHelper.LINE_HEIGHT;

	var startX = testHelper.MARGINS.left + TABLE_PADDING_X + TABLE_BORDER_STRENGTH;
	var startY = testHelper.MARGINS.top + TABLE_PADDING_Y + TABLE_BORDER_STRENGTH;

	it('renders a simple table', function () {
		var dd = {
			content: {
				table: {
					body: [
						['Column 1', 'Column 2'],
						['Value 1', 'Value 2']
					]
				}
			}
		};

		var pages = testHelper.renderPages('A6', dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 4);

		var firstColumnSpacing = startX + (TABLE_PADDING_X) * 2 + TABLE_BORDER_STRENGTH * 1 + lines[0].item.maxWidth;

		assert.deepEqual(lines.map(node => node.item).map(item => item.x), [
			startX, firstColumnSpacing,
			startX, firstColumnSpacing]);

		assert.deepEqual(lines.map(node => node.item).map(item => item.y), [
			startY, startY,
			testHelper.MARGINS.top + TABLE_LINE_HEIGHT, testHelper.MARGINS.top + TABLE_LINE_HEIGHT
		]);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), 'Column 1');
		assert.deepEqual(getColumnText(lines, { cell: 1 }), 'Column 2');

		assert.deepEqual(getColumnText(lines, { cell: 2 }), 'Value 1');
		assert.deepEqual(getColumnText(lines, { cell: 3 }), 'Value 2');
	});

	it('renders a table with nested list', function () {
		var dd = {
			content: {
				table: {
					body: [
						['Column 1'],
						[
							{ ul: ['item 1', 'item 2'] }
						]
					]
				}
			}
		};

		var pages = testHelper.renderPages('A6', dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 3);

		var bulletSpacing = testHelper.getWidthOfString(testHelper.DEFAULT_BULLET_SPACER);

		assert.deepEqual(lines.map(node => node.item).map(item => item.x), [
			startX,
			startX + bulletSpacing,
			startX + bulletSpacing
		]);

		assert.deepEqual(lines.map(node => node.item).map(item => item.y), [
			startY,
			testHelper.MARGINS.top + TABLE_LINE_HEIGHT,
			testHelper.MARGINS.top + TABLE_LINE_HEIGHT + testHelper.LINE_HEIGHT
		]);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), 'Column 1');
		assert.deepEqual(getColumnText(lines, { cell: 1 }), 'item 1');
		assert.deepEqual(getColumnText(lines, { cell: 2 }), 'item 2');
	});

	it('renders a table with nested table', function () {
		var dd = {
			content: {
				table: {
					body: [
						['Column 1', 'Column 2'],
						[
							{
								table: {
									body: [
										['C1', 'C2']
									]
								}
							},
							'Some Value'
						]
					]
				}
			}
		};

		var pages = testHelper.renderPages('A6', dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 5);

		var firstColumnSpacing = startX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH + lines[0].item.maxWidth;

		var startSubTableX = (startX + TABLE_PADDING_X + TABLE_BORDER_STRENGTH);
		var firstSubColumnSpacing = startSubTableX + (TABLE_PADDING_X) * 2 + TABLE_BORDER_STRENGTH + lines[3].item.maxWidth;

		assert.deepEqual(lines.map(node => node.item).map(item => item.x), [
			startX,
			firstColumnSpacing,

			startSubTableX,
			firstSubColumnSpacing,

			firstColumnSpacing
		]);

		assert.deepEqual(lines.map(node => node.item).map(item => item.y), [
			startY,
			startY,

			testHelper.MARGINS.top + TABLE_LINE_HEIGHT + TABLE_PADDING_Y + TABLE_BORDER_STRENGTH,
			testHelper.MARGINS.top + TABLE_LINE_HEIGHT + TABLE_PADDING_Y + TABLE_BORDER_STRENGTH,

			testHelper.MARGINS.top + TABLE_LINE_HEIGHT
		]);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), 'Column 1');
		assert.deepEqual(getColumnText(lines, { cell: 1 }), 'Column 2');

		assert.deepEqual(getColumnText(lines, { cell: 2 }), 'C1');
		assert.deepEqual(getColumnText(lines, { cell: 3 }), 'C2');

		assert.deepEqual(getColumnText(lines, { cell: 4 }), 'Some Value');
	});

	it('renders a simple table with star width', function () {
		var definedWidth = 25;
		var dd = {
			content: {
				table: {
					widths: [definedWidth, '*'],
					body: [
						['C1', 'C2']
					]
				}
			}
		};

		var pages = testHelper.renderPages('A6', dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 2);

		var firstColumnSpacing = startX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH + definedWidth;

		assert.deepEqual(lines.map(node => node.item).map(item => item.x), [
			startX,
			firstColumnSpacing
		]);

		assert.deepEqual(lines.map(node => node.item).map(item => item.y), [
			startY,
			startY
		]);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), 'C1');
		assert.deepEqual(getColumnText(lines, { cell: 1 }), 'C2');

		var starWidth = sizes.A6[0] - (testHelper.MARGINS.left + testHelper.MARGINS.right) - definedWidth - 4 * TABLE_PADDING_X - 3 * TABLE_BORDER_STRENGTH;
		assert.equal(lines[1].item.maxWidth, starWidth);
	});

	it('renders a simple table with auto width', function () {
		var definedWidth = 25;
		var dd = {
			content: {
				table: {
					widths: [definedWidth, 'auto'],
					body: [
						['C1', 'Column 2']
					]
				}
			}
		};

		var pages = testHelper.renderPages('A6', dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 2);

		var firstColumnSpacing = startX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH + definedWidth;

		assert.deepEqual(lines.map(node => node.item).map(item => item.x), [
			startX,
			firstColumnSpacing
		]);

		assert.deepEqual(lines.map(node => node.item).map(item => item.y), [
			startY,
			startY
		]);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), 'C1');
		assert.deepEqual(getColumnText(lines, { cell: 1 }), 'Column 2');

		var autoWidth = testHelper.getWidthOfString('Column 2');
		assert.equal(lines[1].item.maxWidth, autoWidth);
	});

	it('renders a simple table with colspan', function () {
		var dd = {
			content: {
				table: {
					body: [
						[{ text: 'Column 1 with colspan 2', colSpan: 2 }, { text: 'is not rendered at all' }, { text: 'Column 2' }]
					]
				}
			}
		};

		var pages = testHelper.renderPages('A6', dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 2);

		assert.deepEqual(lines.map(node => node.item).map(item => item.x)[0], startX);
		assert.deepEqual(lines.map(node => node.item).map(item => item.y)[0], startY);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), 'Column 1 with colspan 2');
		assert.deepEqual(getColumnText(lines, { cell: 1 }), 'Column 2');
	});

	it('renders a simple table with rowspan', function () {
		var dd = {
			content: {
				table: {
					body: [
						[{ text: 'Row 1 with rowspan 2', rowSpan: 2 }],
						[{ text: 'is not rendered at all' }],
						[{ text: 'Row 2' }]
					]
				}
			}
		};

		var pages = testHelper.renderPages('A6', dd);
		var lines = getCells(pages, { pageNumber: 0 });

		assert.equal(pages.length, 1);
		assert.equal(lines.length, 2);

		assert.deepEqual(lines.map(node => node.item).map(item => item.x)[0], startX);
		assert.deepEqual(lines.map(node => node.item).map(item => item.y)[0], startY);

		assert.deepEqual(getColumnText(lines, { cell: 0 }), 'Row 1 with rowspan 2');
		assert.deepEqual(getColumnText(lines, { cell: 1 }), 'Row 2');
	});

});
