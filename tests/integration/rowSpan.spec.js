'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');
var TableProcessor = require('../../js/TableProcessor').default;

describe('Integration test: row span borders across pages', function () {
	[false, true].forEach(function (nested) {
		it('fills overlapping spans on all pages, nested=' + nested, function () {
			function lines(count, prefix) {
				return Array.from({ length: count }, (_, index) => ({ text: prefix + index }));
			}
			var table = { table: { widths: ['*', '*', '*'], body: [
				[{ rowSpan: 3, stack: lines(90, 'long-'), fillColor: '#eeeeee' }, 'first', 'right'],
				[{}, { rowSpan: 2, stack: lines(60, 'overlap-'), fillColor: '#ddffdd' }, 'middle'],
				[{}, {}, 'last']
			] } };
			var pages = new IntegrationTestHelper().renderPages('A6', {
				content: [nested ? { table: { widths: ['*'], body: [[table]] } } : table]
			});
			[['long-', 90, '#eeeeee'], ['overlap-', 60, '#ddffdd']].forEach(function ([prefix, count, color]) {
				var texts = [];
				pages.forEach(page => {
					var spanLines = page.items.filter(entry => entry.type === 'line' && entry.item.inlines[0].text.startsWith(prefix));
					var fills = page.items.filter(entry => entry.type === 'vector' && entry.item.color === color);
					spanLines.forEach(entry => {
						texts.push(entry.item.inlines.map(inline => inline.text).join(''));
						assert.ok(Math.min(...fills.map(fill => fill.item.y)) <= entry.item.y);
						assert.ok(Math.max(...fills.map(fill => fill.item.y + fill.item.h)) >= entry.item.y + entry.item.getHeight());
					});
				});
				assert.deepStrictEqual(texts, lines(count, prefix).map(node => node.text));
			});
		});
	});

	[0, 1].forEach(function (spanColumn) {
		[30, 60].forEach(function (lineCount) {
			[0, 1].forEach(function (headerRows) {
				[1, 30].forEach(function (sideLines) {
					it('covers a span in column ' + spanColumn + ', lines=' + lineCount + ', headers=' + headerRows + ', side lines=' + sideLines, function () {
						function lines(count, prefix) {
							return Array.from({ length: count }, (_, index) => ({ text: prefix + index }));
						}
						var firstRow = ['first', 'first'];
						firstRow[spanColumn] = { rowSpan: 2, stack: lines(lineCount, 'span-'), fillColor: '#eeeeee' };
						var lastRow = [{ stack: lines(sideLines, 'last-') }, { stack: lines(sideLines, 'last-') }];
						lastRow[spanColumn] = {};
						var body = headerRows ? [['header', 'header'], firstRow, lastRow] : [firstRow, lastRow];
						var helper = new IntegrationTestHelper();
						var pages = helper.renderPages('A6', {
							content: [{ table: { headerRows: headerRows, widths: ['*', '*'], body: body } }, 'after']
						});
						var spanTexts = [];
						assert.ok(pages.length >= 2);
						pages.forEach(page => {
							var spanLines = page.items.filter(entry => entry.type === 'line' && entry.item.inlines[0].text.startsWith('span-'));
							spanTexts.push(...spanLines.map(entry => entry.item.inlines.map(inline => inline.text).join('')));
							if (spanLines.length === 0) {
								return;
							}
							var borders = page.items.filter(entry => entry.type === 'vector' && entry.item.type === 'line' && entry.item.x1 === entry.item.x2);
							var fills = page.items.filter(entry => entry.type === 'vector' && entry.item.color === '#eeeeee');
							assert.equal(new Set(borders.map(entry => entry.item.x1)).size, 3);
							spanLines.forEach(entry => {
								var top = entry.item.y;
								var bottom = top + entry.item.getHeight();
								assert.ok(Math.min(...borders.map(border => border.item.y1)) <= top, 'Borders must start above span text');
								assert.ok(Math.max(...borders.map(border => border.item.y2)) >= bottom, 'Borders must end below span text');
								assert.ok(Math.min(...fills.map(fill => fill.item.y)) <= top, 'Fill must start above span text');
								assert.ok(Math.max(...fills.map(fill => fill.item.y + fill.item.h)) >= bottom, 'Fill must end below span text');
							});
						});
						assert.deepStrictEqual(spanTexts, lines(lineCount, 'span-').map(node => node.text));
						var texts = pages.flatMap(page => page.items.filter(entry => entry.type === 'line').map(entry => entry.item.inlines.map(inline => inline.text).join('')));
						assert.deepStrictEqual(texts.filter(text => text.startsWith('last-')), lines(sideLines, 'last-').map(node => node.text));
						assert.equal(texts.filter(text => text === 'after').length, 1);
					});
				});
			});
		});
	});
});

describe('Integration test: row spans with explicit page breaks (#207-31)', function () {
	function definition(wrapped, count, pageBreak, dontBreakRows) {
		var table = { table: {
			widths: ['*', '*'],
			dontBreakRows: dontBreakRows,
			body: [
				[{ text: Array.from({ length: count }, (_, i) => 'SPAN-' + i).join('\n'), rowSpan: 2 }, 'A'],
				[{}, { text: 'B', pageBreak: pageBreak }]
			]
		} };
		return {
			pageSize: 'A6',
			content: [wrapped ? { unbreakable: true, stack: [table] } : table, { text: 'AFTER' }]
		};
	}

	function texts(page) {
		return page.items.filter(entry => entry.type === 'line')
			.map(entry => entry.item.inlines.map(inline => inline.text).join(''));
	}

	// Exercise the retry with both lengths and row modes for ordinary breaks.
	// Parity variants and unwrapped controls need only representative cases here.
	var cases = ['before', 'after'].flatMap(pageBreak => [1, 30].flatMap(count =>
		[false, true].map(dontBreakRows => ({ wrapped: true, count, pageBreak, dontBreakRows }))));
	cases.push(
		{ wrapped: true, count: 1, pageBreak: 'beforeOdd', dontBreakRows: false },
		{ wrapped: true, count: 30, pageBreak: 'beforeEven', dontBreakRows: true },
		{ wrapped: true, count: 30, pageBreak: 'afterOdd', dontBreakRows: false },
		{ wrapped: true, count: 1, pageBreak: 'afterEven', dontBreakRows: true },
		{ wrapped: false, count: 1, pageBreak: 'after', dontBreakRows: true },
		{ wrapped: false, count: 30, pageBreak: 'before', dontBreakRows: false }
	);
	cases.forEach(function ({ wrapped, count, pageBreak, dontBreakRows }) {
		it('preserves text with break=' + pageBreak + ', wrapped=' + wrapped + ', lines=' + count + ', dontBreakRows=' + dontBreakRows, function () {
			var pages = new IntegrationTestHelper().renderPages('A6', definition(wrapped, count, pageBreak, dontBreakRows));
			var expected = Array.from({ length: count }, (_, i) => 'SPAN-' + i).concat(['A', 'B', 'AFTER']);

			assert.deepStrictEqual(pages.flatMap(texts).sort(), expected.sort());
			pages.forEach(page => page.items.filter(entry => entry.type === 'line').forEach(entry => {
				assert.ok(Number.isFinite(entry.item.x));
				assert.ok(Number.isFinite(entry.item.y));
			}));
			if (count === 1 && pageBreak === 'after') {
				assert.deepStrictEqual(pages.map(texts), [['SPAN-0', 'A', 'B'], ['AFTER']]);
			}
		});
	});

	it('creates a PDF after retrying a short wrapped row span with an explicit break', async function () {
		var pdfmake = new (require('../../js/index').constructor)();
		pdfmake.addFonts(require('../../fonts/Roboto'));
		pdfmake.setLocalAccessPolicy(() => true);
		pdfmake.setUrlAccessPolicy(() => false);
		var docDefinition = definition(true, 1, 'after', true);
		var table = docDefinition.content[0].stack[0];
		var buffer = await pdfmake.createPdf(docDefinition).getBuffer();

		assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
		assert.equal((buffer.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 2);
		assert.equal(table.table.body[0][0].positions[0].pageNumber, 1);
		assert.equal(table.table.body[1][1].positions[0].pageNumber, 1);
		assert.equal(docDefinition.content[1].positions[0].pageNumber, 2);
	});
});

describe('Integration test: oversized row spans', function () {
	var testHelper = new IntegrationTestHelper();

	function lines(count, prefix) {
		return Array.from({ length: count }, (_, index) => ({ text: prefix + index }));
	}

	function texts(page) {
		return page.items.filter(item => item.type === 'line').map(item => item.item.inlines.map(inline => inline.text).join(''));
	}

	[10, 20, 40, 80].forEach(function (count) {
		it('clears span contexts linearly for ' + count + ' independent groups (#207-29)', function () {
			var deleting = false;
			var deletes = 0;
			var body = Array.from({ length: count }, (_, i) => [
				[{ rowSpan: 2, stack: lines(30, 'G' + i + '-') }, { text: 'B' + i }],
				[{}, { text: 'C' + i }]
			]).flat();
			body.forEach(row => {
				row.forEach = function (callback, thisArg) {
					return Array.prototype.forEach.call(this, (cell, index) => {
						var value = deleting ? new Proxy(cell, {
							deleteProperty(target, key) {
								if (key === '_columnEndingContext') deletes++;
								return Reflect.deleteProperty(target, key);
							}
						}) : cell;
						callback.call(thisArg, value, index, this);
					});
				};
			});
			var originalRelease = TableProcessor.prototype.releaseRowSpans;
			TableProcessor.prototype.releaseRowSpans = function (...args) {
				deleting = true;
				try {
					return originalRelease.apply(this, args);
				} finally {
					deleting = false;
				}
			};

			try {
				var pages = testHelper.renderPages('A6', { content: [{ table: { dontBreakRows: true, body } }] });
				var expected = Array.from({ length: count }, (_, i) =>
					lines(30, 'G' + i + '-').map(node => node.text).concat(['B' + i, 'C' + i])).flat();

				assert.deepStrictEqual(pages.flatMap(texts).sort(), expected.sort());
				assert.equal(pages.length, 2 * count);
				assert.ok(deletes <= 4 * count, 'context cleanup must grow linearly with the number of cells');
			} finally {
				TableProcessor.prototype.releaseRowSpans = originalRelease;
				body.forEach(row => delete row.forEach);
			}
		});
	});

	[10, 40].forEach(function (rowCount) {
		it('preserves ' + rowCount + ' oversized independent rows with linear span checks', function () {
			var originalRelease = TableProcessor.prototype.releaseRowSpans;
			var releasing = false;
			var reads = 0;
			var expectedTexts = [];
			var body = Array.from({ length: rowCount }, (_, rowIndex) => {
				var rowTexts = lines(30, 'row-' + rowIndex + '-').map(node => node.text);
				expectedTexts.push(...rowTexts);
				return [{
					text: rowTexts.join('\n'),
					get rowSpan() {
						if (releasing) {
							reads++;
						}
						return undefined;
					}
				}];
			});
			TableProcessor.prototype.releaseRowSpans = function (...args) {
				releasing = true;
				try {
					return originalRelease.apply(this, args);
				} finally {
					releasing = false;
				}
			};

			try {
				var pages = testHelper.renderPages('A6', {
					content: [{ table: { dontBreakRows: true, body } }]
				});
				assert.deepEqual(pages.flatMap(texts), expectedTexts);
				assert.equal(pages.length, rowCount * 2);
				assert.ok(reads <= rowCount * 2, 'rowSpan checks must grow linearly across layout passes');
			} finally {
				TableProcessor.prototype.releaseRowSpans = originalRelease;
			}
		});
	});

	[0, 1].forEach(function (spanColumn) {
		[[0, 0], [1, 0], [1, 1]].forEach(function ([headerRows, keepWithHeaderRows]) {
			it('preserves a span in column ' + spanColumn + ', headers=' + headerRows + ', keep=' + keepWithHeaderRows, function () {
				var body = headerRows ? [['header-left', 'header-right']] : [];
				var row = ['right-0', 'right-0'];
				row[spanColumn] = { rowSpan: 2, stack: lines(60, 'span-'), fillColor: '#eeeeee' };
				body.push(row);
				row = ['right-1', 'right-1'];
				row[spanColumn] = {};
				body.push(row, [{ stack: lines(10, 'short-') }, 'end']);
				var pages = testHelper.renderPages('A6', {
					content: [{ canvas: [{ type: 'rect', x: 3, y: 4, w: 10, h: 10 }] }, { text: 'before' }, {
						table: { dontBreakRows: true, headerRows: headerRows, keepWithHeaderRows: keepWithHeaderRows, widths: ['*', '*'], body: body }
					}, { text: 'after' }]
				});

				var allTexts = pages.flatMap(texts);
				assert.deepEqual(allTexts.filter(text => text.startsWith('span-')), lines(60, 'span-').map(node => node.text));
				assert.deepEqual(allTexts.filter(text => text.startsWith('right-')), ['right-0', 'right-1']);
				assert.deepEqual(allTexts.filter(text => text.startsWith('short-')), lines(10, 'short-').map(node => node.text));
				assert.equal(pages.filter(page => texts(page).some(text => text.startsWith('short-'))).length, 1);
				['before', 'end', 'after'].forEach(text => assert.equal(allTexts.filter(value => value === text).length, 1));
				var canvas = pages[0].items.find(item => item.type === 'vector' && item.item.w === 10 && item.item.h === 10).item;
				assert.equal(canvas.x, testHelper.MARGINS.left + 3);
				assert.equal(canvas.y, testHelper.MARGINS.top + 4);
				pages.forEach(page => {
					page.items.filter(item => item.type === 'line').forEach(item => {
						assert.ok(item.item.y >= testHelper.MARGINS.top);
						assert.ok(item.item.y + item.item.getHeight() <= page.pageSize.height - testHelper.MARGINS.bottom);
					});
					var spanLines = page.items.filter(item => item.type === 'line' && item.item.inlines.some(inline => inline.text.startsWith('span-')));
					if (spanLines.length) {
						if (headerRows) {
							assert.ok(texts(page).includes('header-left'));
							assert.ok(texts(page).includes('header-right'));
						}
						var borders = page.items.filter(item => item.type === 'vector' && item.item.type === 'line' && item.item.x1 === item.item.x2);
						assert.equal(new Set(borders.map(item => item.item.x1)).size, 3);
						var fills = page.items.filter(item => item.type === 'vector' && item.item.color === '#eeeeee');
						spanLines.forEach(line => {
							assert.ok(Math.min(...borders.map(border => border.item.y1)) <= line.item.y);
							assert.ok(Math.max(...borders.map(border => border.item.y2)) >= line.item.y + line.item.getHeight());
							assert.ok(Math.min(...fills.map(fill => fill.item.y)) <= line.item.y);
							assert.ok(Math.max(...fills.map(fill => fill.item.y + fill.item.h)) >= line.item.y + line.item.getHeight());
						});
					}
				});
			});
		});
	});

	it('releases overlapping spans with colSpan and keeps following short rows together', function () {
		var pages = testHelper.renderPages('A6', {
			content: [{ table: {
				dontBreakRows: true,
				widths: ['*', '*', '*'],
				body: [
					[{ rowSpan: 2, colSpan: 2, stack: lines(60, 'long-') }, {}, 'right'],
					[{}, {}, { rowSpan: 2, text: 'overlap' }],
					['left', 'middle', {}],
					[{ stack: lines(10, 'short-') }, 'end', 'last']
				]
			} }]
		});

		var allTexts = pages.flatMap(texts);
		assert.deepEqual(allTexts.filter(text => text.startsWith('long-')), lines(60, 'long-').map(node => node.text));
		['right', 'overlap', 'left', 'middle', 'end', 'last'].forEach(text => assert.equal(allTexts.filter(value => value === text).length, 1));
		assert.equal(pages.filter(page => texts(page).some(text => text.startsWith('short-'))).length, 1);
	});

	it('preserves an oversized span in a nested table inside an unbreakable row', function () {
		var pages = testHelper.renderPages('A6', {
			content: [{ table: {
				dontBreakRows: true,
				body: [[{ table: {
					headerRows: 1,
					keepWithHeaderRows: 1,
					dontBreakRows: true,
					widths: ['*', '*'],
					body: [['header', 'header'], [{ rowSpan: 2, stack: lines(60, 'span-') }, 'right-0'], [{}, 'right-1']]
				} }], ['end']]
			} }]
		});

		var allTexts = pages.flatMap(texts);
		assert.deepEqual(allTexts.filter(text => text.startsWith('span-')), lines(60, 'span-').map(node => node.text));
		assert.deepEqual(allTexts.filter(text => text.startsWith('right-')), ['right-0', 'right-1']);
		assert.equal(allTexts.filter(text => text === 'end').length, 1);
	});
});
