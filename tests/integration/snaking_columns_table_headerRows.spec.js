'use strict';

var assert = require('assert');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: snaking columns with table headerRows and keepWithHeaderRows', function () {

	var testHelper = new integrationTestHelper();

	// Helper: find all occurrences of a specific inline text across pages
	function findTextPositions(pages, searchText) {
		var positions = [];
		pages.forEach(function (page, pageIndex) {
			page.items.forEach(function (item) {
				if (item.type === 'line' && item.item && item.item.inlines) {
					item.item.inlines.forEach(function (inline) {
						if (inline.text && inline.text.indexOf(searchText) >= 0) {
							positions.push({
								page: pageIndex,
								x: Math.round(item.item.x),
								y: Math.round(item.item.y)
							});
						}
					});
				}
			});
		});
		return positions;
	}

	describe('headerRows inside snaking columns', function () {

		it('should repeat header row when table snakes to column 2 on same page', function () {
			var tableBody = [
				[{ text: 'HDR_A', bold: true }, { text: 'HDR_B', bold: true }]
			];
			for (var i = 1; i <= 40; i++) {
				tableBody.push(['Row_' + i + '_A', 'Row_' + i + '_B']);
			}

			var dd = {
				content: [{
					columns: [
						{ table: { headerRows: 1, body: tableBody }, width: '*' },
						{ text: '', width: '*' }
					],
					columnGap: 30,
					snakingColumns: true
				}]
			};

			var pages = testHelper.renderPages('A4', dd);
			assert.equal(pages.length, 1, 'Small table should fit on 1 page');

			var headerPositions = findTextPositions(pages, 'HDR_A');
			assert.equal(headerPositions.length, 2, 'Header should appear twice (once per column)');

			// Headers should be at different X positions (column 1 and column 2)
			assert.notEqual(headerPositions[0].x, headerPositions[1].x,
				'Headers should be at different X positions');

			// Both headers should be at (approximately) the same Y
			assert.ok(Math.abs(headerPositions[0].y - headerPositions[1].y) < 5,
				'Both headers should be near the top of their columns');
		});

		it('should repeat header row across multiple pages with snaking columns', function () {
			var tableBody = [
				[{ text: 'HDR_MULTI_A', bold: true }, { text: 'HDR_MULTI_B', bold: true }]
			];
			for (var i = 1; i <= 200; i++) {
				tableBody.push(['R' + i + 'A', 'R' + i + 'B']);
			}

			var dd = {
				content: [{
					columns: [
						{ table: { headerRows: 1, body: tableBody }, width: '*' },
						{ text: '', width: '*' }
					],
					columnGap: 30,
					snakingColumns: true
				}]
			};

			var pages = testHelper.renderPages('A4', dd);
			assert.ok(pages.length >= 2, 'Should span multiple pages');

			var headerPositions = findTextPositions(pages, 'HDR_MULTI_A');

			// Each page should have 2 header occurrences (one per column),
			// except possibly the last page if all remaining rows fit in column 1
			assert.ok(headerPositions.length >= pages.length,
				'Header should appear at least once per page (found ' + headerPositions.length +
				' across ' + pages.length + ' pages)');

			// Headers should appear on every page
			var pagesWithHeaders = new Set(headerPositions.map(function (p) { return p.page; }));
			for (var p = 0; p < pages.length; p++) {
				assert.ok(pagesWithHeaders.has(p),
					'Header should appear on page ' + (p + 1));
			}

			// On pages where both columns are used, headers should align at the same Y.
			for (var pageIndex = 0; pageIndex < pages.length; pageIndex++) {
				var pageHeaders = headerPositions.filter(function (pos) { return pos.page === pageIndex; });
				if (pageHeaders.length >= 2) {
					assert.ok(Math.abs(pageHeaders[0].y - pageHeaders[1].y) < 2,
						'Page ' + (pageIndex + 1) + ': column headers should share same Y');
				}
			}
		});

		it('should repeat header row in a 3-column snaking layout', function () {
			var tableBody = [
				[{ text: 'H3_A', bold: true }, { text: 'H3_B', bold: true }]
			];
			for (var i = 1; i <= 150; i++) {
				tableBody.push(['T' + i + 'A', 'T' + i + 'B']);
			}

			var dd = {
				content: [{
					columns: [
						{ table: { headerRows: 1, body: tableBody }, width: '*' },
						{ text: '', width: '*' },
						{ text: '', width: '*' }
					],
					columnGap: 20,
					snakingColumns: true
				}],
				pageMargins: [30, 30, 30, 30]
			};

			var pages = testHelper.renderPages('A4', dd);

			var headerPositions = findTextPositions(pages, 'H3_A');

			// With 3 columns, first page should have header in all 3 columns
			var page0Headers = headerPositions.filter(function (p) { return p.page === 0; });
			assert.ok(page0Headers.length >= 2,
				'Page 1 should have headers in at least 2 columns (found ' + page0Headers.length + ')');

			// Check that headers are at different X positions
			var uniqueX = new Set(page0Headers.map(function (p) { return p.x; }));
			assert.ok(uniqueX.size >= 2,
				'Headers should appear at different X positions on page 1');
		});

		it('should not repeat headers when headerRows is not set', function () {
			var tableBody = [
				[{ text: 'NOHDR_A', bold: true }, { text: 'NOHDR_B', bold: true }]
			];
			for (var i = 1; i <= 40; i++) {
				tableBody.push(['Row_' + i + '_A', 'Row_' + i + '_B']);
			}

			var dd = {
				content: [{
					columns: [
						{ table: { body: tableBody }, width: '*' },
						{ text: '', width: '*' }
					],
					columnGap: 30,
					snakingColumns: true
				}]
			};

			var pages = testHelper.renderPages('A4', dd);

			var headerPositions = findTextPositions(pages, 'NOHDR_A');
			assert.equal(headerPositions.length, 1,
				'Without headerRows, header text should appear only once');
		});
	});

	describe('keepWithHeaderRows inside snaking columns', function () {

		it('should keep first data row with header using keepWithHeaderRows', function () {
			var tableBody = [
				[{ text: 'KWH_HDR', bold: true }, { text: 'KWH_VAL', bold: true }]
			];
			for (var i = 1; i <= 200; i++) {
				tableBody.push(['KD_' + i + '_A', 'KD_' + i + '_B']);
			}

			var dd = {
				content: [{
					columns: [
						{
							table: {
								headerRows: 1,
								keepWithHeaderRows: 1,
								body: tableBody
							},
							width: '*'
						},
						{ text: '', width: '*' }
					],
					columnGap: 30,
					snakingColumns: true
				}]
			};

			var pages = testHelper.renderPages('A4', dd);
			assert.ok(pages.length >= 2, 'Should span multiple pages');

			var headerPositions = findTextPositions(pages, 'KWH_HDR');

			// Headers should appear on every page
			assert.ok(headerPositions.length >= pages.length,
				'keepWithHeaderRows: header should appear on every page');

			// On each page with headers, the first data row should immediately follow
			// (no orphaned header at bottom of column)
			headerPositions.forEach(function (pos) {
				// Find data text closest below this header on same page and same x
				var dataAfter = [];
				pages[pos.page].items.forEach(function (item) {
					if (item.type === 'line' && item.item && item.item.inlines) {
						item.item.inlines.forEach(function (inline) {
							if (inline.text && inline.text.indexOf('KD_') === 0) {
								var itemX = Math.round(item.item.x);
								var itemY = Math.round(item.item.y);
								if (itemX === pos.x && itemY > pos.y && itemY < pos.y + 50) {
									dataAfter.push({ text: inline.text, y: itemY });
								}
							}
						});
					}
				});
				assert.ok(dataAfter.length > 0,
					'Page ' + (pos.page + 1) + ': data row should follow header at x=' + pos.x);
			});
		});

		it('should not draw duplicate horizontal lines at header-data boundary in continuation columns', function () {
			var tableBody = [];
			tableBody.push(['Header 1', 'Header 2', 'Header 3']);
			tableBody.push(['Row 1', 'Column 2', 'Column 3']);
			for (var i = 2; i <= 200; i++) {
				tableBody.push(['Row ' + i, 'Column 2', 'Column 3']);
			}

			var dd = {
				content: [{
					columns: [
						{
							table: {
								headerRows: 2,
								keepWithHeaderRows: 1,
								body: tableBody
							},
							width: '*'
						},
						{ text: '', width: '*' }
					],
					columnGap: 30,
					snakingColumns: true
				}]
			};

			var pages = testHelper.renderPages('A4', dd);

			var hLines = [];
			pages[0].items.forEach(function (item) {
				if (item.type === 'vector' && item.item && item.item.type === 'line') {
					var v = item.item;
					if (Math.abs(v.y1 - v.y2) < 0.01) {
						hLines.push({
							y: Math.round(v.y1 * 100) / 100,
							x1: Math.round(v.x1 * 100) / 100,
							x2: Math.round(v.x2 * 100) / 100
						});
					}
				}
			});

			var seen = {};
			var duplicates = [];
			hLines.forEach(function (line) {
				var key = line.y + '|' + line.x1 + '|' + line.x2;
				if (seen[key]) {
					duplicates.push(line);
				}
				seen[key] = true;
			});

			assert.equal(duplicates.length, 0,
				'Found ' + duplicates.length + ' duplicate horizontal line(s): ' +
				duplicates.map(function (d) { return 'y=' + d.y + ' x1=' + d.x1 + ' x2=' + d.x2; }).join('; '));
		});
	});

	describe('headerRows + keepWithHeaderRows combo in snaking columns', function () {

		it('should support multi-row headers with keepWithHeaderRows in snaking columns', function () {
			var tableBody = [];
			// 2 header rows
			tableBody.push([
				{ text: 'COMBO_TITLE', bold: true, colSpan: 2 }, {}
			]);
			tableBody.push([
				{ text: 'COMBO_COL1', bold: true },
				{ text: 'COMBO_COL2', bold: true }
			]);
			for (var i = 1; i <= 150; i++) {
				tableBody.push(['CD_' + i + '_A', 'CD_' + i + '_B']);
			}

			var dd = {
				content: [{
					columns: [
						{
							table: {
								headerRows: 2,
								keepWithHeaderRows: 1,
								body: tableBody
							},
							width: '*'
						},
						{ text: '', width: '*' }
					],
					columnGap: 30,
					snakingColumns: true
				}]
			};

			var pages = testHelper.renderPages('A4', dd);
			assert.ok(pages.length >= 2, 'Should span multiple pages');

			// Both header rows should be repeated
			var titlePositions = findTextPositions(pages, 'COMBO_TITLE');
			var colPositions = findTextPositions(pages, 'COMBO_COL1');

			assert.ok(titlePositions.length >= pages.length,
				'Title header should appear on every page');
			assert.ok(colPositions.length >= pages.length,
				'Column header should appear on every page');

			// Title and column headers should appear at same x positions
			// (matching column structure)
			pages.forEach(function (page, pi) {
				var pageTitles = titlePositions.filter(function (p) { return p.page === pi; });
				var pageCols = colPositions.filter(function (p) { return p.page === pi; });

				if (pageTitles.length > 0 && pageCols.length > 0) {
					// The title and column header for each column should have matching x
					assert.equal(pageTitles.length, pageCols.length,
						'Page ' + (pi + 1) + ': title and column header count should match');
				}
			});
		});

		it('should not break table rendering for subsequent content', function () {
			var tableBody = [
				[{ text: 'H', bold: true }, { text: 'V', bold: true }]
			];
			for (var i = 1; i <= 50; i++) {
				tableBody.push(['R' + i, 'V' + i]);
			}

			var dd = {
				content: [
					{
						columns: [
							{
								table: {
									headerRows: 1,
									keepWithHeaderRows: 1,
									body: tableBody
								},
								width: '*'
							},
							{ text: '', width: '*' }
						],
						columnGap: 30,
						snakingColumns: true
					},
					{ text: 'AFTER_SNAKING_TABLE', fontSize: 12, margin: [0, 10, 0, 0] }
				]
			};

			var pages = testHelper.renderPages('A4', dd);

			// Content after the table should be present
			var afterPositions = findTextPositions(pages, 'AFTER_SNAKING_TABLE');
			assert.ok(afterPositions.length > 0,
				'Content after snaking table with headerRows should be rendered');
		});
	});
});
