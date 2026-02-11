'use strict';

var assert = require('assert');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: snaking columns with real table nodes', function () {

	function normalizeX(x) {
		return Math.round(x);
	}

	var testHelper = new integrationTestHelper();

	it('should snake a real table node from column 1 to column 2 on the same page', function () {
		var tableBody = [['Header 1', 'Header 2', 'Header 3']];
		for (var i = 1; i <= 30; i++) {
			tableBody.push(['Row ' + i, 'Column 2', 'Column 3']);
		}

		var dd = {
			content: [
				{
					columns: [
						{
							table: {
								body: tableBody
							},
							width: '*'
						},
						{ text: '', width: '*' }
					],
					columnGap: 30,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		// 30 rows should fit on one page across 2 columns
		assert.equal(pages.length, 1, 'Table with 30 rows should fit on 1 page with snaking columns');

		var items = pages[0].items;
		var lineItems = items.filter(node => node.type === 'line');
		var xPositions = lineItems.map(node => normalizeX(node.item.x));
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		// Content should appear in at least 2 distinct X positions (column 1 and column 2)
		assert.ok(uniqueX.length >= 2, 'Table should snake to column 2, got X positions: ' + JSON.stringify(uniqueX));
	});

	it('should preserve table borders in both columns', function () {
		var tableBody = [['A', 'B']];
		for (var i = 1; i <= 40; i++) {
			tableBody.push(['Row ' + i, 'Val ' + i]);
		}

		var dd = {
			content: [
				{
					columns: [
						{
							table: {
								body: tableBody
							},
							width: '*'
						},
						{ text: '', width: '*' }
					],
					columnGap: 20,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		// Check that vector items (table borders) exist at multiple X positions
		var vectorItems = pages[0].items.filter(node => node.type === 'vector');

		assert.ok(vectorItems.length > 0, 'Table should have border vectors');

		var vectorX = vectorItems.map(v => normalizeX(v.item.x1 || v.item.x || 0));
		var uniqueVectorX = [...new Set(vectorX)].sort((a, b) => a - b);

		// Borders should appear at positions for both column 1 and column 2
		var minX = Math.min(...uniqueVectorX);
		var maxX = Math.max(...uniqueVectorX);
		assert.ok(maxX - minX > 100, 'Table borders should span across both columns, got range: ' + minX + ' to ' + maxX);
	});

	it('should handle large table spanning multiple pages with snaking columns', function () {
		var tableBody = [['Header 1', 'Header 2', 'Header 3']];
		for (var i = 1; i <= 200; i++) {
			tableBody.push(['Row ' + i, 'Column 2', 'Column 3']);
		}

		var dd = {
			content: [
				{
					columns: [
						{
							table: {
								body: tableBody
							},
							width: '*'
						},
						{ text: '', width: '*' }
					],
					columnGap: 30,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		// 200 rows across 2 columns should use multiple pages but fewer than without snaking
		assert.ok(pages.length >= 2, 'Should use multiple pages for 200 rows');
		assert.ok(pages.length <= 5, 'With snaking, should use far fewer pages than single-column (got ' + pages.length + ')');

		// Verify each page has content in multiple columns
		for (var p = 0; p < pages.length - 1; p++) {
			var lineItems = pages[p].items.filter(node => node.type === 'line');
			var xPositions = lineItems.map(node => normalizeX(node.item.x));
			var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

			if (lineItems.length > 10) {
				assert.ok(uniqueX.length >= 2, 'Page ' + (p + 1) + ' should have content in at least 2 columns');
			}
		}
	});

	it('should render content after snaking table correctly', function () {
		var tableBody = [['A', 'B']];
		for (var i = 1; i <= 20; i++) {
			tableBody.push(['Row ' + i, 'Val ' + i]);
		}

		var dd = {
			content: [
				{
					columns: [
						{
							table: {
								body: tableBody
							},
							width: '*'
						},
						{ text: '', width: '*' }
					],
					columnGap: 20,
					snakingColumns: true
				},
				{ text: 'After table content', fontSize: 12, margin: [0, 10, 0, 0] }
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		// Find the "After table content" text
		var afterItems = [];
		pages.forEach(function (page) {
			page.items.forEach(function (node) {
				if (node.type === 'line' && node.item.inlines) {
					var text = node.item.inlines.map(function (i) { return i.text; }).join('');
					if (text.indexOf('After table') >= 0) {
						afterItems.push(node);
					}
				}
			});
		});

		assert.ok(afterItems.length > 0, '"After table content" text should appear in the document');
	});

	it('should handle single-column table that fits without snaking', function () {
		var tableBody = [['A', 'B']];
		for (var i = 1; i <= 5; i++) {
			tableBody.push(['Row ' + i, 'Val ' + i]);
		}

		var dd = {
			content: [
				{
					columns: [
						{
							table: {
								body: tableBody
							},
							width: '*'
						},
						{ text: '', width: '*' }
					],
					columnGap: 20,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		// Small table should fit on one page, column 1 only
		assert.equal(pages.length, 1, 'Small table should fit on 1 page');
	});

	it('should handle table with different column widths in snaking layout', function () {
		var tableBody = [['Name', 'Price']];
		for (var i = 1; i <= 50; i++) {
			tableBody.push(['Product ' + i, '$' + (i * 10) + '.00']);
		}

		var dd = {
			content: [
				{
					columns: [
						{
							table: {
								widths: ['*', 60],
								body: tableBody
							},
							width: '*'
						},
						{ text: '', width: '*' }
					],
					columnGap: 30,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.ok(pages.length >= 1, 'Should render at least 1 page');

		// Should have content in multiple x positions
		var lineItems = pages[0].items.filter(node => node.type === 'line');
		var xPositions = lineItems.map(node => normalizeX(node.item.x));
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		assert.ok(uniqueX.length >= 2, 'Table with custom widths should snake correctly');
	});
});
