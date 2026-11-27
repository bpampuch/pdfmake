'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: repeated table headers in snaking columns', function () {
	var testHelper = new IntegrationTestHelper();

	function text(entry) {
		return entry.item.inlines.map(inline => inline.text).join('');
	}

	[2, 3].forEach(function (columns) {
		['text', 'table'].forEach(function (kind) {
			(kind === 'table' ? [false, true] : [false]).forEach(function (dontBreakRows) {
				['left', 'right'].forEach(function (alignment) {
					it('repeats only the inner header between columns, columns=' + columns + ', dontBreakRows=' + dontBreakRows + ', kind=' + kind + ', alignment=' + alignment, function () {
						var count = kind === 'text' ? 30 : 24;
						var expected = Array.from({ length: count }, (_, i) => 'R' + i);
						var inner = kind === 'text' ? { text: expected.join('\n') } : {
							table: { widths: [25], headerRows: 1, dontBreakRows: dontBreakRows, body: [['H']].concat(expected.map(value => [value])) }
						};
						var pages = testHelper.renderPages('A6', { content: [{ tableAlignment: alignment, table: {
							widths: [190], headerRows: 1,
							body: [['OUTER'], [{ snakingColumns: true, columns: Array.from({ length: columns }, (_, i) => i === 0 ? inner : {}) }]]
						} }] });
						assert.equal(pages.length, 1);
						var lines = pages[0].items.filter(entry => entry.type === 'line');
						assert.equal(lines.filter(entry => text(entry) === 'OUTER').length, 1);
						var data = lines.filter(entry => /^R\d+$/.test(text(entry)));
						assert.deepEqual(data.map(text), expected);
						if (kind === 'table') {
							var headers = lines.filter(entry => text(entry) === 'H');
							var dataColumns = Array.from(new Set(data.map(entry => entry.item.x)));
							assert(dataColumns.length > 1);
							assert.deepEqual(headers.map(entry => entry.item.x), dataColumns);
						}
						pages[0].items.filter(entry => entry.type === 'vector').forEach(function (entry) {
							assert(Math.max(entry.item.x1 || 0, entry.item.x2 || 0) <= pages[0].pageSize.width);
						});
					});
				});
			});
		});
	});

	it('does not repeat an ancestor header owned by an outer snaking group', function () {
		var expected = Array.from({ length: 30 }, (_, i) => 'R' + i);
		var pages = testHelper.renderPages('A6', { content: [{ snakingColumns: true, columns: [{ table: {
			widths: [190], headerRows: 1,
			body: [['OUTER'], [{ snakingColumns: true, columns: [{ text: expected.join('\n') }, {}] }]]
		} }] }] });
		assert.equal(pages.length, 1);
		var lines = pages[0].items.filter(entry => entry.type === 'line');
		assert.equal(lines.filter(entry => text(entry) === 'OUTER').length, 1);
		assert.deepEqual(lines.filter(entry => /^R\d+$/.test(text(entry))).map(text), expected);
	});

	['left', 'right'].forEach(function (alignment) {
		['text', 'table'].forEach(function (kind) {
			it('preserves the ancestor header position around inner snaking ' + kind + ', alignment=' + alignment, function () {
				var count = kind === 'text' ? 65 : 45;
				var inner = kind === 'text' ? { text: Array.from({ length: count }, (_, i) => 'R' + i).join('\n') } : {
					table: { widths: [40], headerRows: 1, body: [['INNER']].concat(Array.from({ length: count }, (_, i) => ['R' + i])) }
				};
				var snaking = { snakingColumns: true, columnGap: 10, columns: [{ stack: Array.from({ length: 30 }, (_, i) => ({ text: 'P' + i })).concat(inner) }, {}] };
				var pages = testHelper.renderPages('A6', {
					content: [{ tableAlignment: alignment, table: { widths: [190], headerRows: 1, body: [['OUTER'], [snaking]] } }]
				});
				assert(pages.length >= 2);
				var first = pages[0].items.find(entry => entry.type === 'line' && text(entry) === 'OUTER').item;
				var rows = [];
				pages.forEach(function (page) {
					var lines = page.items.filter(entry => entry.type === 'line');
					assert.equal(lines.filter(entry => text(entry) === 'OUTER').length, 1);
					assert(lines.some(entry => text(entry) === 'OUTER' && Math.abs(entry.item.x - first.x) < 1e-8 && entry.item.y === first.y));
					rows.push(...lines.filter(entry => /^R\d+$/.test(text(entry))).map(text));
				});
				assert.deepEqual(rows, Array.from({ length: count }, (_, i) => 'R' + i));
			});
		});
	});

	it('positions headers when taller unbreakable rows force a page break', function () {
		var table = { table: {
			widths: [40], headerRows: 1, dontBreakRows: true,
			heights: row => row % 4 === 3 ? 70 : 16,
			body: [['H']].concat(Array.from({ length: 45 }, (_, i) => ['R' + i]))
		} };
		var pages = testHelper.renderPages('A6', {
			content: [{ snakingColumns: true, columnGap: 10, columns: [{ stack: Array.from({ length: 30 }, (_, i) => ({ text: 'P' + i })).concat(table) }, {}] }]
		});
		var rows = [];
		pages.forEach(function (page) {
			var lines = page.items.filter(entry => entry.type === 'line');
			var data = lines.filter(entry => /^R\d+$/.test(text(entry)));
			rows.push(...data.map(text));
			var round = x => Math.round(x * 1e8) / 1e8;
			assert.deepEqual(lines.filter(entry => text(entry) === 'H').map(entry => round(entry.item.x)).sort((a, b) => a - b),
				Array.from(new Set(data.map(entry => round(entry.item.x)))).sort((a, b) => a - b));
		});
		assert.deepEqual(rows, Array.from({ length: 45 }, (_, i) => 'R' + i));
	});

	['left', 'right'].forEach(function (alignment) {
		it('preserves independent headers in ordinary nested tables aligned ' + alignment, function () {
			var inner = { table: { widths: [40], headerRows: 1, body: [['INNER']].concat(Array.from({ length: 45 }, (_, i) => ['R' + i])) } };
			var pages = testHelper.renderPages('A6', {
				content: [{ tableAlignment: alignment, table: { widths: [140], headerRows: 1, body: [['OUTER'], [inner]] } }]
			});
			assert(pages.length >= 2);
			var positions = {};
			var rows = [];
			pages.forEach(function (page) {
				var lines = page.items.filter(entry => entry.type === 'line');
				['OUTER', 'INNER'].forEach(function (label) {
					var headers = lines.filter(entry => text(entry) === label);
					assert.equal(headers.length, 1);
					if (positions[label] === undefined) positions[label] = headers[0].item.x;
					assert.equal(headers[0].item.x, positions[label]);
				});
				var data = lines.filter(entry => /^R\d+$/.test(text(entry)));
				data.forEach(entry => assert.equal(entry.item.x, positions.INNER));
				rows.push(...data.map(text));
			});
			assert.deepEqual(rows, Array.from({ length: 45 }, (_, i) => 'R' + i));
		});
	});

	[[103.82, 103.82], [80, 127.64], [60, 60, 77.64]].forEach(function (widths) {
		[0, 30].forEach(function (prefix) {
			[false, true].forEach(function (dontBreakRows) {
				['left', 'center', 'right'].forEach(function (alignment) {
					it('positions each header above its data, widths=' + widths + ', prefix=' + prefix + ', dontBreakRows=' + dontBreakRows + ', alignment=' + alignment, function () {
						var rowCount = widths.length === 3 ? 65 : 45;
						var table = {
							table: { widths: [40], headerRows: 1, dontBreakRows: dontBreakRows, body: [['H']].concat(Array.from({ length: rowCount }, (_, i) => ['R' + i])) },
							tableAlignment: alignment
						};
						var pages = testHelper.renderPages('A6', {
							content: [{
								snakingColumns: true, columnGap: 10,
								columns: widths.map((width, i) => i === 0 ? {
									width: width, stack: Array.from({ length: prefix }, (_, j) => ({ text: 'P' + j })).concat(table)
								} : { width: width, text: '' })
							}]
						});
						assert(pages.length >= 2);
						var rows = [];
						pages.forEach(function (page) {
							var lines = page.items.filter(entry => entry.type === 'line');
							var headers = lines.filter(entry => text(entry) === 'H');
							var data = lines.filter(entry => /^R\d+$/.test(text(entry)));
							rows.push(...data.map(text));
							var round = x => Math.round(x * 1e8) / 1e8;
							var dataColumns = Array.from(new Set(data.map(entry => round(entry.item.x))));
							assert.deepEqual(headers.map(entry => round(entry.item.x)).sort((a, b) => a - b), dataColumns.sort((a, b) => a - b));
							headers.forEach(function (header) {
								var firstRow = data.find(entry => Math.abs(entry.item.x - header.item.x) < 1e-8);
								assert(header.item.y < firstRow.item.y);
							});
						});
						assert.deepEqual(rows, Array.from({ length: rowCount }, (_, i) => 'R' + i));
					});
				});
			});
		});
	});
});
