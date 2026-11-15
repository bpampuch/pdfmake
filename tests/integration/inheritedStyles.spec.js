'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');
var Renderer = require('../../js/Renderer').default;

describe('Integration test: inherited styles of reused nodes', function () {
	var testHelper = new IntegrationTestHelper();
	var svgText = '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="20"><text x="0" y="15">SVG</text></svg>';

	function content() {
		return [{ text: 'P1' }, { text: 'P2', pageBreak: 'before' }, { text: 'P3', pageBreak: 'before' }];
	}

	function fills(pages) {
		return pages.map(page => page.items.filter(item => item.type === 'vector' && item.item.color)
			.map(item => ({ color: item.item.color, opacity: item.item.fillOpacity })));
	}

	['header', 'background'].forEach(function (location) {
		[false, true].forEach(function (rowSpan) {
			it('recomputes cell fills in a reused ' + location + ', rowSpan=' + rowSpan, function () {
				function makeTable() {
					return {
						table: { widths: [50, 50], body: rowSpan ? [[{ text: 'CELL', rowSpan: 2 }, 'A'], ['', 'B']] : [[{ text: 'CELL' }, 'A']] },
						layout: 'noBorders'
					};
				}
				function render(shared) {
					var table = makeTable();
					var pages = testHelper.renderPages('A6', {
						content: content(),
						[location]: page => ({ stack: [shared ? table : makeTable()], fillColor: page % 2 ? 'red' : 'blue', fillOpacity: page % 2 ? 0.2 : 0.8 })
					});
					assert.equal(table.table.body[0][0].fillColor, undefined);
					assert.equal(table.table.body[0][0].fillOpacity, undefined);
					return fills(pages);
				}
				var actual = render(true);
				assert.deepEqual(actual, render(false));
				actual.forEach(function (page, i) {
					assert(page.length > 0);
					page.forEach(fill => assert.deepEqual(fill, { color: i % 2 ? 'blue' : 'red', opacity: i % 2 ? 0.8 : 0.2 }));
				});
			});
		});
	});

	[false, true].forEach(function (namedStyle) {
		it('preserves explicit cell fills and zero opacity, namedStyle=' + namedStyle, function () {
			var cell = namedStyle ? { text: 'CELL', style: 'cell' } : { text: 'CELL', fillColor: 'green', fillOpacity: 0 };
			var table = { table: { widths: [50], body: [[cell]] }, layout: 'noBorders' };
			var pages = testHelper.renderPages('A6', {
				content: content(),
				styles: { cell: { fillColor: 'green', fillOpacity: 0 } },
				header: page => ({ stack: [table], fillColor: page % 2 ? 'red' : 'blue', fillOpacity: 0.8 })
			});
			assert.deepEqual(fills(pages), Array(3).fill([{ color: 'green', opacity: 0 }]));
			assert.equal(cell.fillColor, namedStyle ? undefined : 'green');
			assert.equal(cell.fillOpacity, namedStyle ? undefined : 0);
		});
	});

	it('falls back to the table layout after the inherited fill is removed', function () {
		var table = { table: { widths: [50], body: [[{ text: 'CELL' }]] }, layout: { fillColor: 'green', fillOpacity: 0.6 } };
		var pages = testHelper.renderPages('A6', {
			content: content(),
			header: page => ({ stack: [table], ...(page === 1 ? { fillColor: 'red', fillOpacity: 0.2 } : {}) })
		});
		assert.deepEqual(fills(pages), [[{ color: 'red', opacity: 0.2 }], [{ color: 'green', opacity: 0.6 }], [{ color: 'green', opacity: 0.6 }]]);
	});

	[undefined, 'Roboto'].forEach(function (explicitFont) {
		it('renders reused SVG with the current inherited or explicit font, explicit=' + explicitFont, function () {
			var svg = { svg: svgText, ...(explicitFont ? { font: explicitFont } : {}) };
			var pages = testHelper.renderPages('A6', {
				content: content(),
				header: page => ({ stack: [svg], font: page % 2 ? 'Roboto' : 'Other' })
			});
			assert.equal(svg.font, explicitFont);
			var doc = testHelper.pdfDocument;
			doc.fonts.Other = { normal: 'fonts/Roboto/Roboto-Medium.ttf' };
			var selected = [];
			var provideFont = doc.provideFont;
			doc.provideFont = function (family, bold, italics) {
				selected.push(family);
				return provideFont.call(this, family, bold, italics);
			};
			try {
				new Renderer(doc).renderPages(pages);
				assert.deepEqual(selected, explicitFont ? ['Roboto', 'Roboto', 'Roboto'] : ['Roboto', 'Other', 'Roboto']);
			} finally {
				doc.end();
				doc.resume();
			}
		});
	});

	it('keeps the font of an SVG already placed in the body when the header reuses it', function () {
		var svg = { svg: svgText };
		var pages = testHelper.renderPages('A6', {
			content: [svg],
			header: () => ({ stack: [svg], font: 'Other' })
		});
		var items = pages[0].items.filter(item => item.type === 'svg');
		assert.deepEqual(items.map(item => item.item._font), ['Roboto', 'Other']);
		assert.notStrictEqual(items[0].item, svg);
	});

	['table', 'svg'].forEach(function (kind) {
		it('recomputes inherited styles after pageBreakBefore repeats the layout for ' + kind, function () {
			var shared = kind === 'table' ? { table: { widths: [50], body: [[{ text: 'CELL' }]] }, layout: 'noBorders' } : { svg: svgText };
			var calls = [];
			var pages = testHelper.renderPages('A6', {
				content: [{ text: 'A' }, { text: 'MOVE' }],
				header: (page, count) => {
					calls.push(count);
					return { stack: [shared], fillColor: count === 1 ? 'red' : 'blue', fillOpacity: count === 1 ? 0.2 : 0.8, ...(kind === 'svg' ? { font: count === 1 ? 'Roboto' : 'Other' } : {}) };
				},
				pageBreakBefore: node => node.text === 'MOVE' && node.startPosition.pageNumber === 1
			});
			assert(calls.includes(1));
			assert(calls.includes(2));
			assert.equal(pages.length, 2);
			if (kind === 'table') {
				assert.deepEqual(fills(pages), [[{ color: 'blue', opacity: 0.8 }], [{ color: 'blue', opacity: 0.8 }]]);
			} else {
				assert.deepEqual(pages.map(page => page.items.find(item => item.type === 'svg').item._font), ['Other', 'Other']);
			}
		});
	});
});
