'use strict';

var assert = require('assert');
var sizes = require('../../js/standardPageSizes').default;

var integrationTestHelper = require('./integrationTestHelper');
var Renderer = require('../../js/Renderer').default;

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

	['left', 'center', 'right'].forEach(function (alignment) {
		[false, true].forEach(function (dontBreakRows) {
			it('aligns a multipage table ' + alignment + ' with dontBreakRows=' + dontBreakRows, function () {
				var body = [['Header']];
				for (var i = 0; i < 40; i++) {
					body.push(['Row ' + i]);
				}
				var pages = testHelper.renderPages('A6', {
					content: [
						{ margin: [13, 0, 27, 0], tableAlignment: alignment, table: { widths: [80], headerRows: 1, dontBreakRows: dontBreakRows, body: body } },
						{ text: 'After' }
					]
				});
				var tableWidth = 80 + 2 * TABLE_PADDING_X + 2 * TABLE_BORDER_STRENGTH;
				var freeWidth = sizes.A6[0] - 80 - 13 - 27 - tableWidth;
				var offset = alignment === 'center' ? freeWidth / 2 : (alignment === 'right' ? freeWidth : 0);
				assert(pages.length > 1);
				pages.forEach(function (page) {
					var lines = page.items.filter(node => node.type === 'line');
					lines.forEach(function (node) {
						var text = node.item.inlines.map(inline => inline.text).join('');
						assert.equal(node.item.x, text === 'After' ? 40 : startX + 13 + offset);
					});
					var borders = page.items.filter(node => node.type === 'vector' && node.item.type === 'line');
					borders.forEach(function (node) {
						assert(node.item.x1 >= 40 + 13 + offset);
						assert(node.item.x2 <= 40 + 13 + offset + tableWidth);
					});
				});
			});
		});
	});

	it('aligns a nested table within its cell without changing text alignment', function () {
		var pages = testHelper.renderPages('A6', {
			content: [
				{ table: { widths: [180], body: [[
					{ tableAlignment: 'center', table: { widths: [60], body: [['Nested']] } }
				]] } },
				{ text: 'After' }
			]
		});
		var lines = getCells(pages, { pageNumber: 0 });
		assert.equal(lines[0].item.x, startX + (180 - 70) / 2 + 5);
		assert.equal(lines[1].item.x, 40);
	});

	it('centers auto columns including custom padding, borders and fills', function () {
		function render(alignment) {
			return testHelper.renderPages('A6', {
				content: {
					layout: {
						paddingLeft: () => 7,
						paddingRight: () => 11,
						vLineWidth: () => 3,
						fillColor: () => 'yellow'
					},
					tableAlignment: alignment,
					table: { widths: ['auto', 'auto'], body: [['A', 'B']] }
				}
			})[0].items;
		}
		var left = render('left');
		var centered = render('center');
		var borders = left.filter(node => node.type === 'vector' && node.item.type === 'line');
		var rightEdge = Math.max(...borders.map(node => Math.max(node.item.x1, node.item.x2))) + 1.5;
		var offset = (sizes.A6[0] - 40 - rightEdge) / 2;
		assert.equal(left.length, centered.length);
		left.forEach(function (node, index) {
			var item = centered[index].item;
			if (node.type === 'line' || node.item.type === 'rect') {
				assert(Math.abs(item.x - node.item.x - offset) < 0.000001);
			} else {
				assert(Math.abs(item.x1 - node.item.x1 - offset) < 0.000001);
				assert(Math.abs(item.x2 - node.item.x2 - offset) < 0.000001);
			}
		});
	});

	['*', 300].forEach(function (width) {
		it('keeps full-width and overflowing tables at the left origin (width=' + width + ')', function () {
			var pages = testHelper.renderPages('A6', {
				content: { tableAlignment: 'center', table: { widths: [width], body: [['A']] } }
			});
			assert.equal(getCells(pages, { pageNumber: 0 })[0].item.x, startX);
		});
	});

	it('keeps a centered table aligned when flowing to the next snaking column', function () {
		var body = [['Header']];
		for (var i = 0; i < 40; i++) {
			body.push(['Row']);
		}
		var pages = testHelper.renderPages('A6', {
			content: {
				columns: [{ stack: [
					{ tableAlignment: 'center', table: { widths: [40], headerRows: 1, body: body } },
					{ text: 'After' }
				] }, {}],
				columnGap: 10,
				snakingColumns: true
			}
		});
		var columnWidth = (sizes.A6[0] - 80 - 10) / 2;
		var offset = (columnWidth - 50) / 2;
		var origins = [40, 40 + columnWidth + 10];
		var foundSecondColumn = false;
		pages.forEach(function (page) {
			page.items.filter(node => node.type === 'line').forEach(function (node) {
				var isAfter = node.item.inlines[0].text === 'After';
				var expected = origins.map(x => x + (isAfter ? 0 : offset + 5));
				assert(expected.some(x => Math.abs(x - node.item.x) < 0.000001), 'Unexpected x: ' + node.item.x);
				if (node.item.x > origins[1]) {
					foundSecondColumn = true;
				}
			});
		});
		assert(foundSecondColumn);
	});

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

	[0, 1].forEach(function (outerHeaderRows) {
		[1, 2].forEach(function (innerHeaderRows) {
			[1, 2].forEach(function (depth) {
				it('encloses repeated nested headers (#2090), outer headers=' + outerHeaderRows + ', inner headers=' + innerHeaderRows + ', depth=' + depth, function () {
					var body = Array.from({ length: innerHeaderRows }, (_, i) => ['Inner ' + i, 'Header']);
					for (var i = 0; i < 40; i++) body.push(['Row ' + i, 'Value']);
					var nested = { table: { widths: ['*', '*'], headerRows: innerHeaderRows, body: body } };
					var colors = ['red', 'blue'];
					for (var level = 0; level < depth; level++) {
						let color = colors[level];
						nested.fillColor = color;
						nested = {
							layout: { hLineColor: () => color, vLineColor: () => color },
							table: { widths: ['*'], headerRows: outerHeaderRows, body: [['Outer ' + level], [nested]] }
						};
					}
					var pages = testHelper.renderPages('A6', { content: [nested] });
					assert(pages.length > 2);
					pages.forEach(function (page) {
						var lines = page.items.filter(node => node.type === 'line');
						var headers = lines.filter(node => /^Inner /.test(node.item.inlines.map(inline => inline.text).join('')));
						assert.equal(headers.length, innerHeaderRows);
						colors.slice(0, depth).forEach(function (color) {
							var borders = page.items.filter(node => node.type === 'vector' && node.item.type === 'line' &&
								node.item.lineColor === color && node.item.x1 === node.item.x2);
							var fills = page.items.filter(node => node.type === 'vector' && node.item.type === 'rect' && node.item.color === color);
							headers.forEach(function (header) {
								assert.equal(borders.filter(node => node.item.y1 <= header.item.y &&
									node.item.y2 >= header.item.y + header.item.getHeight()).length, 2);
								assert(fills.some(node => node.item.y <= header.item.y &&
									node.item.y + node.item.h >= header.item.y + header.item.getHeight()));
							});
						});
					});
					var rowTexts = pages.flatMap(page => page.items.filter(node => node.type === 'line'))
						.map(node => node.item.inlines.map(inline => inline.text).join('')).filter(text => /^Row /.test(text));
					assert.deepEqual(rowTexts, Array.from({ length: 40 }, (_, i) => 'Row ' + i));
				});
			});
		});
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

	[false, true].forEach(function (dontBreakRows) {
		[0, 1].forEach(function (headerRows) {
			it('keeps table borders around content after pageBreakBefore (#2826), dontBreakRows=' + dontBreakRows + ', headerRows=' + headerRows, function () {
				function createDefinition() {
					return {
						content: [{
							table: {
								dontBreakRows: dontBreakRows,
								headerRows: headerRows,
								body: Array.from({ length: 50 }, (_, i) => [{
									id: 'row_' + i,
									text: 'line ' + i + '\nMultiline: true\npreserveLeadingSpaces: true',
									preserveLeadingSpaces: true
								}])
							}
						}]
					};
					}

				function getPageItems(pages) {
					return pages.map(page => page.items.map(node => {
						if (node.type === 'line') {
							return { text: node.item.inlines.map(inline => inline.text).join(''), x: node.item.x, y: node.item.y };
						}
						return node.item;
					}));
				}

				var dd = createDefinition();
				dd.pageBreakBefore = node => node.startPosition.top >= 430;
				var pages = testHelper.renderPages('A4', dd);
				var explicit = createDefinition();
				dd.content[0].table.body.forEach(function (row, index) {
					if (row[0].pageBreak === 'before') {
						explicit.content[0].table.body[index][0].pageBreak = 'before';
					}
				});

				assert(pages.length > 1);
				assert.deepEqual(getPageItems(pages), getPageItems(testHelper.renderPages('A4', explicit)));
				var texts = pages.flatMap(page => page.items.filter(node => node.type === 'line'))
					.map(node => node.item.inlines.map(inline => inline.text).join(''));
				assert.deepEqual(texts.filter(text => /^line /.test(text) && text !== 'line 0'),
					Array.from({ length: 49 }, (_, i) => 'line ' + (i + 1)));
				pages.forEach(function (page) {
					var lines = page.items.filter(node => node.type === 'line');
					var bottom = Math.max(...lines.map(node => node.item.y + node.item.getHeight()));
					page.items.filter(node => node.type === 'vector' && node.item.type === 'line').forEach(function (node) {
						assert(Math.max(node.item.y1, node.item.y2) <= bottom + TABLE_PADDING_Y + TABLE_BORDER_STRENGTH);
					});
				});
			});
		});
	});

	it('recalculates rowSpan page breaks when pageBreakBefore changes the table layout', function () {
		function render(useCallback) {
			var dd = {
				content: [{
					table: {
						widths: [100, 100],
						body: Array.from({ length: 20 }, (_, i) => [
							i % 2 === 0 ? { text: 'Span ' + i, rowSpan: 2 } : {},
							{ id: 'row_' + i, text: 'line ' + i + '\nSecond line', pageBreak: !useCallback && i === 6 ? 'before' : undefined }
						])
					}
				}]
			};
			if (useCallback) {
				dd.pageBreakBefore = node => node.id === 'row_6';
			}
			return testHelper.renderPages('A6', dd).map(page => page.items.map(node => {
				if (node.type === 'line') {
					return { text: node.item.inlines.map(inline => inline.text).join(''), x: node.item.x, y: node.item.y };
				}
				return node.item;
			}));
		}

		assert.deepEqual(render(true), render(false));
	});

	it('does not insert an extra page when combining headerRows, dontBreakRows and cell pageBreak', function () {
		var dd = {
			content: {
				table: {
					dontBreakRows: true,
					headerRows: 1,
					body: [
						['row Header', 'column B'],
						['row 1', 'column B'],
						['row 2', 'column B'],
						['row 3', 'column B'],
						[{ text: '', pageBreak: 'after' }, ''],
						['row 4', 'column B'],
						['row 5', 'column B']
					]
				}
			}
		};

		var pages = testHelper.renderPages('A6', dd);
		var page1Texts = getCells(pages, { pageNumber: 0 }).map(node => node.item.inlines.map(inline => inline.text).join(''));
		var page2Texts = getCells(pages, { pageNumber: 1 }).map(node => node.item.inlines.map(inline => inline.text).join(''));

		assert.equal(pages.length, 2);
		assert.deepEqual(page1Texts, ['row Header', 'column B', 'row 1', 'column B', 'row 2', 'column B', 'row 3', 'column B', '', '']);
		assert.deepEqual(page2Texts, ['row Header', 'column B', 'row 4', 'column B', 'row 5', 'column B']);
	});

	it('keeps finite page dimensions with dontBreakRows tables without headers', function () {
		var dd = {
			content: {
				table: {
					dontBreakRows: true,
					body: [
						['row 1', 'column B'],
						['row 2', 'column B'],
						['row 3', 'column B']
					]
				}
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		pages.forEach(page => {
			assert.equal(Number.isFinite(page.pageSize.width), true);
			assert.equal(Number.isFinite(page.pageSize.height), true);
		});
	});

	it('keeps row heights stable when rowSpan crosses pages with dontBreakRows (#2895)', function () {
		var dd = {
			content: {
				table: {
					dontBreakRows: true,
					heights: 45,
					widths: [50, 100, 200, 50],
					body: [
						['1', '2', '3', '4'],
						[{ rowSpan: 4, text: '4span' }, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 2, text: '2span' }, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 2, text: null }, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 2, text: null }, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 15, text: 'span 15', maxHeight: 50 }, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 5, text: 'span 5' }, null, null, null],
						[null, null, null, null],
						[{ rowSpan: 2, text: null }, null, null, null],
						[null, null, null, null],
						[null, null, null, null]
					]
				}
			}
		};

		var pages = testHelper.renderPages('A4', dd);
		var lastPage = pages[pages.length - 1];
		var horizontalLineYs = [...new Set(
			lastPage.items
				.filter(node => node.type === 'vector' && node.item.type === 'line' && Math.abs(node.item.y1 - node.item.y2) < 0.001)
				.map(node => Number(node.item.y1.toFixed(3)))
		)].sort((a, b) => a - b);

		var maxGap = 0;
		for (var i = 1; i < horizontalLineYs.length; i++) {
			maxGap = Math.max(maxGap, horizontalLineYs[i] - horizontalLineYs[i - 1]);
		}

		// Each row is 45pt tall. A gap above ~90pt would indicate a blown-out row caused
		// by a negative discountY when a rowspan started on a previous page. Allow up to
		// 2x row height (90pt) as a safe upper bound; anything beyond that is the bug.
		assert.ok(maxGap < 90, 'max gap between horizontal lines was ' + maxGap + 'pt, expected < 90pt');
	});

	it('keeps rowSpan header verticalAlignment stable on repeated tables (#2925)', function () {
		function createReportTable() {
			var rows = [
				['D-001', '500', '480', '-20', 'In Progress'],
				['D-002', '300', '350', '+50', 'Exceeded'],
				['D-003', '750', '750', '0', 'Achieved'],
				['D-004', '200', '180', '-20', 'Under Review'],
				['D-005', '400', '410', '+10', 'Achieved']
			];

			return {
				margin: [0, 5, 0, 15],
				table: {
					headerRows: 2,
					widths: ['auto', '*', '*', '*', 'auto'],
					body: [
						[
							{ text: 'Dept ID', style: 'tableHeader', rowSpan: 2, verticalAlignment: 'middle' },
							{ text: 'Performance Indicators', style: 'tableHeader', colSpan: 3 },
							{},
							{},
							{ text: 'Status', style: 'tableHeader', rowSpan: 2 }
						],
						[{}, { text: 'Target', style: 'tableHeader' }, { text: 'Actual', style: 'tableHeader' }, { text: 'Gap', style: 'tableHeader' }, {}],
						...rows,
						...rows,
						...rows
					]
				}
			};
		}

		var content = [];
		for (var i = 1; i <= 3; i++) {
			content.push({ text: 'Statistical Report - Page ' + i, style: 'header' });
			content.push(createReportTable());
			if (i < 3) {
				content.push({ text: '', pageBreak: 'after' });
			}
		}

		var pages = testHelper.renderPages('A4', {
			content,
			styles: {
				header: { fontSize: 18, bold: true, alignment: 'center' },
				tableHeader: { bold: true, fillColor: '#eeeeee' }
			}
		});

		var viewHeights = pages.map(page => {
			var verticalAlignmentMarker = page.items.find(node => node.type === 'beginVerticalAlignment');

			return verticalAlignmentMarker.item.getViewHeight();
		});

		assert.equal(pages.length, 3);
		assert.deepEqual(viewHeights, [viewHeights[0], viewHeights[0], viewHeights[0]]);
		assert.ok(viewHeights[0] > 0, 'rowSpan header view height must remain positive');
	});

	describe('clipCells', function () {
		var LONG_TEXT = 'A text much longer than the width of its cell';

		// items of a page with the innermost cell clip enclosing each of them, or their own one (fills of cells), checking that clips are balanced
		function getClippedItems(page) {
			var clips = [];
			var result = page.items.filter(node => node.type !== 'beginCellClip' && node.type !== 'endCellClip').map(() => null);
			var index = 0;
			page.items.forEach(function (node) {
				if (node.type === 'beginCellClip') {
					clips.push(node.item);
				} else if (node.type === 'endCellClip') {
					assert(clips.length > 0, 'endCellClip without beginCellClip');
					clips.pop();
				} else {
					result[index++] = { node: node, clip: node.item._cellClip || (clips.length > 0 ? clips[clips.length - 1] : null) };
				}
			});
			assert.equal(clips.length, 0, 'beginCellClip without endCellClip');
			return result;
		}

		function getClippedLines(page) {
			return getClippedItems(page).filter(clipped => clipped.node.type === 'line').map(clipped => ({
				text: clipped.node.item.inlines.map(inline => inline.text).join(''),
				x: clipped.node.item.x,
				clip: clipped.clip
			}));
		}

		it('does not clip cells by default', function () {
			var pages = testHelper.renderPages('A6', {
				content: { table: { widths: [50], body: [[{ text: LONG_TEXT, noWrap: true }]] } }
			});

			assert(!pages[0].items.some(node => node.type === 'beginCellClip' || node.type === 'endCellClip'));
		});

		it('clips the content of each cell to the cell including its paddings', function () {
			var pages = testHelper.renderPages('A6', {
				content: { table: { clipCells: true, widths: [50, 50], body: [[{ text: LONG_TEXT, noWrap: true }, 'B']] } }
			});

			var lines = getClippedLines(pages[0]);
			assert.equal(lines.length, 2);
			assert.equal(lines[0].text, LONG_TEXT);
			assert.equal(lines[0].x, startX);
			assert.deepEqual(lines[0].clip, { x: startX - TABLE_PADDING_X, width: 50 + 2 * TABLE_PADDING_X });
			assert.equal(lines[1].text, 'B');
			assert.deepEqual(lines[1].clip, { x: startX + 50 + TABLE_PADDING_X + TABLE_BORDER_STRENGTH, width: 50 + 2 * TABLE_PADDING_X });
		});

		it('clips the content of each cell to the cell without its paddings with clipCells: content', function () {
			var pages = testHelper.renderPages('A6', {
				content: { table: { clipCells: 'content', widths: [50, 50], body: [[{ text: LONG_TEXT, noWrap: true }, 'B']] } }
			});

			var lines = getClippedLines(pages[0]);
			assert.equal(lines.length, 2);
			assert.equal(lines[0].x, startX);
			assert.deepEqual(lines[0].clip, { x: startX, width: 50 });
			assert.deepEqual(lines[1].clip, { x: startX + 50 + 2 * TABLE_PADDING_X + TABLE_BORDER_STRENGTH, width: 50 });
		});

		it('clips a cell spanning columns to the content of all of its columns with clipCells: content', function () {
			var pages = testHelper.renderPages('A6', {
				content: { table: { clipCells: 'content', widths: [50, 50], body: [[{ text: LONG_TEXT, noWrap: true, colSpan: 2 }, {}]] } }
			});

			var lines = getClippedLines(pages[0]);
			assert.equal(lines.length, 1);
			// (the paddings between the spanned columns are part of the cell's content)
			assert.deepEqual(lines[0].clip, { x: startX, width: 2 * 50 + 2 * TABLE_PADDING_X + TABLE_BORDER_STRENGTH });
		});

		it('keeps the start of centered and right-aligned lines too long for a clipped cell', function () {
			var body = [[
				{ text: LONG_TEXT, noWrap: true, alignment: 'center' },
				{ text: LONG_TEXT, noWrap: true, alignment: 'right' },
				{ text: 'B', alignment: 'center' }
			]];
			var clipped = getClippedLines(testHelper.renderPages('A6', {
				content: { table: { clipCells: true, widths: [50, 50, 50], body: body } }
			})[0]);
			var unclipped = getClippedLines(testHelper.renderPages('A6', {
				content: { table: { widths: [50, 50, 50], body: body } }
			})[0]);

			var cellX = column => startX + column * (50 + 2 * TABLE_PADDING_X + TABLE_BORDER_STRENGTH);
			assert.equal(clipped[0].x, cellX(0));
			assert.equal(clipped[1].x, cellX(1));
			// (a line that fits keeps its alignment)
			assert(clipped[2].x > cellX(2));
			assert.equal(unclipped[2].x, clipped[2].x);
			// (not clipped: aligned as before, its start outside of the cell)
			assert(unclipped[0].x < cellX(0));
			assert(unclipped[1].x < cellX(1));
		});

		it('clips a cell spanning columns to all of its columns', function () {
			var pages = testHelper.renderPages('A6', {
				content: { table: { clipCells: true, widths: [50, 50], body: [[{ text: LONG_TEXT, noWrap: true, colSpan: 2 }, {}]] } }
			});

			var lines = getClippedLines(pages[0]);
			assert.equal(lines.length, 1);
			assert.deepEqual(lines[0].clip, { x: startX - TABLE_PADDING_X, width: 2 * (50 + 2 * TABLE_PADDING_X) + TABLE_BORDER_STRENGTH });
		});

		it('clips each page of a cell broken across pages and repeated header rows to their own cells', function () {
			var cellLines = [];
			for (var i = 0; i < 40; i++) {
				cellLines.push('Line ' + i);
			}
			var pages = testHelper.renderPages('A6', {
				content: { table: { clipCells: true, headerRows: 1, widths: [50, 50], body: [['Header 1', 'Header 2'], [{ stack: cellLines }, 'B']] } }
			});

			assert(pages.length > 1);
			pages.forEach(function (page, pageIndex) {
				var lines = getClippedLines(page);
				assert(lines.some(line => line.text === 'Header 2'), 'header repeated on page ' + pageIndex);
				lines.forEach(function (line) {
					var column = line.text === 'Header 2' || line.text === 'B' ? 1 : 0;
					assert.deepEqual(line.clip, {
						x: startX - TABLE_PADDING_X + column * (50 + 2 * TABLE_PADDING_X + TABLE_BORDER_STRENGTH),
						width: 50 + 2 * TABLE_PADDING_X
					}, 'line ' + line.text + ' on page ' + pageIndex);
				});
			});
		});

		it('clips a cell spanning rows to its column', function () {
			var pages = testHelper.renderPages('A6', {
				content: { table: { clipCells: true, widths: [50, 50], body: [[{ text: LONG_TEXT, noWrap: true, rowSpan: 2 }, 'B'], [{}, 'D']] } }
			});

			var lines = getClippedLines(pages[0]);
			assert.deepEqual(lines.map(line => line.text), [LONG_TEXT, 'B', 'D']);
			assert.deepEqual(lines[0].clip, { x: startX - TABLE_PADDING_X, width: 50 + 2 * TABLE_PADDING_X });
		});

		it('clips cells of a table nested in a clipped cell to the nested cells', function () {
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: true,
						widths: [100],
						body: [[{ table: { clipCells: true, widths: [30], body: [[{ text: LONG_TEXT, noWrap: true }]] } }]]
					}
				}
			});

			var clips = pages[0].items.filter(node => node.type === 'beginCellClip').map(node => node.item);
			var lines = getClippedLines(pages[0]);
			assert.deepEqual(clips, [
				{ x: startX - TABLE_PADDING_X, width: 100 + 2 * TABLE_PADDING_X },
				{ x: startX + TABLE_BORDER_STRENGTH, width: 30 + 2 * TABLE_PADDING_X }
			]);
			assert.equal(lines.length, 1);
			assert.equal(lines[0].clip, clips[1]);
		});

		it('clips cells of unbreakable rows', function () {
			var pages = testHelper.renderPages('A6', {
				content: [
					{ text: 'Before' },
					{ table: { clipCells: true, dontBreakRows: true, widths: [50, 50], body: [['A', 'B'], [{ text: LONG_TEXT, noWrap: true }, 'D']] } }
				]
			});

			var lines = getClippedLines(pages[0]);
			assert.deepEqual(lines.map(line => line.text), ['Before', 'A', 'B', LONG_TEXT, 'D']);
			assert.equal(lines[0].clip, null);
			[1, 2, 3, 4].forEach(function (index) {
				var column = index % 2 === 1 ? 0 : 1;
				assert.deepEqual(lines[index].clip, {
					x: startX - TABLE_PADDING_X + column * (50 + 2 * TABLE_PADDING_X + TABLE_BORDER_STRENGTH),
					width: 50 + 2 * TABLE_PADDING_X
				});
			});
		});

		it('clips links in a cell to the cell', function () {
			var image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==';
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: true,
						widths: [50, 50],
						body: [
							[{ text: LONG_TEXT, noWrap: true, link: 'https://example.com' }, 'B'],
							[{ image: image, width: 200, link: 'https://example.com' }, 'D']
						]
					}
				}
			});
			new Renderer(testHelper.pdfDocument).renderPages(pages);

			var annotations = testHelper.pdfDocument.page.annotations;
			assert.equal(annotations.length, 2);
			annotations.forEach(function (annotation) {
				assert.equal(annotation.data.Rect[0], startX);
				assert.equal(annotation.data.Rect[2], startX + 50 + TABLE_PADDING_X);
			});
		});

		it('clips absolutely positioned content of a cell to the cell, as the rest of its content', function () {
			var pages = testHelper.renderPages('A6', {
				content: { table: { clipCells: true, widths: [50], body: [[{ text: 'Absolute', absolutePosition: { x: 150, y: 150 } }]] } }
			});

			var lines = getClippedLines(pages[0]);
			assert.equal(lines.length, 1);
			assert.equal(lines[0].x, 150);
			assert.deepEqual(lines[0].clip, { x: startX - TABLE_PADDING_X, width: 50 + 2 * TABLE_PADDING_X });
		});

		it('clips background fills of nested tables with the cell', function () {
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: true,
						widths: [50],
						body: [[{ table: { widths: ['*'], body: [[{ text: LONG_TEXT, noWrap: true, fillColor: 'yellow' }]] } }]]
					}
				}
			});

			var items = getClippedItems(pages[0]);
			var fill = items.find(clipped => clipped.node.type === 'vector' && clipped.node.item.color === 'yellow');
			var line = items.find(clipped => clipped.node.type === 'line');
			assert(fill.node.item.w > 50, 'the nested table is wider than the cell');
			assert.deepEqual(fill.clip, { x: startX - TABLE_PADDING_X, width: 50 + 2 * TABLE_PADDING_X });
			assert.deepEqual(line.clip, fill.clip);
			assert(items.indexOf(fill) < items.indexOf(line), 'the fill is drawn below the text');
		});

		it('clips background fills of nested tables to the content of the cell with clipCells: content', function () {
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: 'content',
						widths: [50],
						body: [[{ table: { widths: ['*'], body: [[{ text: LONG_TEXT, noWrap: true, fillColor: 'yellow' }]] } }]]
					}
				}
			});

			var items = getClippedItems(pages[0]);
			var fill = items.find(clipped => clipped.node.type === 'vector' && clipped.node.item.color === 'yellow');
			var line = items.find(clipped => clipped.node.type === 'line');
			assert.deepEqual(fill.clip, { x: startX, width: 50 });
			assert.deepEqual(line.clip, fill.clip);
		});

		it('clips background fills of tables nested in clipped cells of nested tables to both cells', function () {
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: true,
						widths: [50],
						body: [[{
							table: {
								clipCells: true,
								widths: [100],
								body: [[{ table: { widths: ['*'], body: [[{ text: LONG_TEXT, noWrap: true, fillColor: 'yellow' }]] } }]]
							}
						}]]
					}
				}
			});

			var fill = getClippedItems(pages[0]).find(clipped => clipped.node.type === 'vector' && clipped.node.item.color === 'yellow');
			assert(fill.node.item.w > 50, 'the nested table is wider than the outer cell');
			// from the left edge of the inner cell to the right edge of the outer one
			assert.deepEqual(fill.clip, { x: startX + TABLE_BORDER_STRENGTH, width: 50 + TABLE_PADDING_X - TABLE_BORDER_STRENGTH });
		});

		it('clips background fills of repeated header rows to their cells on each page', function () {
			var cellLines = [];
			for (var i = 0; i < 40; i++) {
				cellLines.push('Line ' + i);
			}
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: true,
						headerRows: 1,
						widths: [50],
						body: [
							[{ table: { widths: ['*'], body: [[{ text: LONG_TEXT, noWrap: true, fillColor: 'yellow' }]] } }],
							[{ stack: cellLines }]
						]
					}
				}
			});

			assert(pages.length > 1);
			pages.forEach(function (page, pageIndex) {
				var fills = getClippedItems(page).filter(clipped => clipped.node.type === 'vector' && clipped.node.item.color === 'yellow');
				assert.equal(fills.length, 1, 'header repeated on page ' + pageIndex);
				assert.deepEqual(fills[0].clip, { x: startX - TABLE_PADDING_X, width: 50 + 2 * TABLE_PADDING_X }, 'page ' + pageIndex);
			});
		});

		it('clips background fills of nested tables in cells of unbreakable rows', function () {
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: true,
						dontBreakRows: true,
						widths: [50],
						body: [[{ table: { widths: ['*'], body: [[{ text: LONG_TEXT, noWrap: true, fillColor: 'yellow' }]] } }]]
					}
				}
			});

			var items = getClippedItems(pages[0]);
			var fill = items.find(clipped => clipped.node.type === 'vector' && clipped.node.item.color === 'yellow');
			var line = items.find(clipped => clipped.node.type === 'line');
			assert(fill.node.item.w > 50, 'the nested table is wider than the cell');
			assert.deepEqual(fill.clip, { x: startX - TABLE_PADDING_X, width: 50 + 2 * TABLE_PADDING_X });
			assert.deepEqual(line.clip, fill.clip);
			assert(items.indexOf(fill) < items.indexOf(line), 'the fill is drawn below the text');
		});

		it('clips background fills of nested tables in an unbreakable block in the cell', function () {
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: true,
						widths: [50],
						body: [[{ unbreakable: true, stack: [{ table: { widths: ['*'], body: [[{ text: LONG_TEXT, noWrap: true, fillColor: 'yellow' }]] } }] }]]
					}
				}
			});

			var items = getClippedItems(pages[0]);
			var fill = items.find(clipped => clipped.node.type === 'vector' && clipped.node.item.color === 'yellow');
			var line = items.find(clipped => clipped.node.type === 'line');
			assert(fill.node.item.w > 50, 'the nested table is wider than the cell');
			assert.deepEqual(fill.clip, { x: startX - TABLE_PADDING_X, width: 50 + 2 * TABLE_PADDING_X });
			assert.deepEqual(line.clip, fill.clip);
			assert(items.indexOf(fill) < items.indexOf(line), 'the fill is drawn below the text');
		});

		it('clips background fills of nested tables in an unbreakable block moved to the next page of the cell', function () {
			var cellLines = [];
			for (var i = 0; i < 15; i++) {
				cellLines.push('Line ' + i);
			}
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: true,
						widths: [50],
						body: [[{
							stack: cellLines.concat([{
								unbreakable: true,
								stack: cellLines.concat([{ table: { widths: ['*'], body: [[{ text: LONG_TEXT, noWrap: true, fillColor: 'yellow' }]] } }])
							}])
						}]]
					}
				}
			});

			assert.equal(pages.length, 2);
			var items = getClippedItems(pages[1]);
			var fill = items.find(clipped => clipped.node.type === 'vector' && clipped.node.item.color === 'yellow');
			var line = items.find(clipped => clipped.node.type === 'line' && clipped.node.item.inlines.map(inline => inline.text).join('') === LONG_TEXT);
			assert(fill, 'the fill is on the next page');
			assert.deepEqual(fill.clip, { x: startX - TABLE_PADDING_X, width: 50 + 2 * TABLE_PADDING_X });
			assert.deepEqual(line.clip, fill.clip);
			assert(items.indexOf(fill) < items.indexOf(line), 'the fill is drawn below the text');
		});

		it('clips cells of rows flowing to the next snaking column at their position in that column', function () {
			var body = [];
			for (var i = 0; i < 25; i++) {
				body.push(['Row ' + i]);
			}
			var pages = testHelper.renderPages('A6', {
				content: {
					columns: [{ table: { clipCells: true, widths: [40], body: body } }, {}],
					columnGap: 10,
					snakingColumns: true
				}
			});

			var columnWidth = (sizes.A6[0] - 80 - 10) / 2;
			var lines = getClippedLines(pages[0]);
			assert(lines.some(line => line.x > 40 + columnWidth), 'rows flow to the second column');
			lines.forEach(function (line) {
				assert.deepEqual(line.clip, { x: line.x - TABLE_PADDING_X, width: 40 + 2 * TABLE_PADDING_X }, 'line ' + line.text);
			});
		});

		it('keeps the clip of a cell at the cell when its columns break across pages', function () {
			var columnLines = [];
			for (var i = 0; i < 40; i++) {
				columnLines.push('Line ' + i);
			}
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: true,
						widths: [150],
						body: [[{ columns: [{ stack: columnLines.slice() }, { stack: columnLines.slice() }] }]]
					}
				}
			});

			assert(pages.length > 1);
			pages.forEach(function (page, pageIndex) {
				var lines = getClippedLines(page);
				assert(lines.some(line => line.x > startX + 50), 'second column on page ' + pageIndex);
				lines.forEach(function (line) {
					assert.deepEqual(line.clip, { x: startX - TABLE_PADDING_X, width: 150 + 2 * TABLE_PADDING_X }, 'line ' + line.text + ' on page ' + pageIndex);
				});
			});
		});

		it('keeps the clip of a cell at the cell when it contains snaking columns', function () {
			var columnLines = [];
			for (var i = 0; i < 30; i++) {
				columnLines.push('Line ' + i);
			}
			var pages = testHelper.renderPages('A6', {
				content: {
					table: {
						clipCells: true,
						widths: [150],
						body: [[{ columns: [{ stack: columnLines }, {}], columnGap: 10, snakingColumns: true }]]
					}
				}
			});

			var lines = getClippedLines(pages[0]);
			assert(lines.some(line => line.x > startX + 50), 'content snakes to the second column');
			lines.forEach(function (line) {
				assert.deepEqual(line.clip, { x: startX - TABLE_PADDING_X, width: 150 + 2 * TABLE_PADDING_X }, 'line ' + line.text);
			});
		});
	});

});
