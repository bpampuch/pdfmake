'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: reused percentage widths', function () {
	var testHelper = new IntegrationTestHelper();

	['columns', 'table', 'padded-table'].forEach(function (kind) {
		[false, true].forEach(function (relayout) {
			it('recalculates ' + kind + ' widths for changing parent margins, relayout=' + relayout, function () {
				function makeNode() {
					if (kind === 'columns') {
						return { columnGap: 0, columns: [{ width: '50%', text: 'A' }, { width: '50%', text: 'B' }] };
					}
					var node = { table: { widths: ['50%', '50%'], body: [['A', 'B']] } };
					if (kind === 'padded-table') {
						node.layout = { paddingLeft: i => i === 0 ? 5 : 11, paddingRight: () => 7, vLineWidth: i => i + 1 };
					}
					return node;
				}
				function render(shared) {
					var node = makeNode();
					var widths = [];
					var pages = testHelper.renderPages('A6', {
						content: relayout ? [{ text: 'P1' }, { text: 'MOVE' }] : [{ text: 'P1' }, { text: 'P2', pageBreak: 'before' }, { text: 'P3', pageBreak: 'before' }],
						header: (page, count) => {
							var current = shared ? node : makeNode();
							widths.push(kind === 'columns' ? current.columns : current.table.widths);
							return { margin: [(relayout ? count === 2 : page === 2) ? 100 : 0, 0, 0, 0], stack: [current] };
						},
						pageBreakBefore: relayout ? item => item.text === 'MOVE' && item.startPosition.pageNumber === 1 : undefined
					});
					return {
						widths: widths,
						geometry: pages.map(page => page.items.filter(entry => entry.type === 'vector' || entry.type === 'line' && ['A', 'B'].includes(entry.item.inlines[0].text))
							.map(({ type, item }) => type === 'line' ? { type, x: item.x, y: item.y, width: item.maxWidth } : { type, x1: item.x1, x2: item.x2, y1: item.y1, y2: item.y2 }))
					};
				}
				var actual = render(true);
				var expected = render(false);
				assert.equal(actual.geometry.length, relayout ? 2 : 3);
				assert.deepEqual(actual.geometry, expected.geometry);
				actual.widths.forEach(columns => assert.deepEqual(columns.map(col => col.width), ['50%', '50%']));
			});
		});
	});
});
