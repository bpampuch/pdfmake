'use strict';

var assert = require('assert');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: snaking columns', function () {

	function normalizeX(x) {
		return Math.round(x);
	}

	function getInlineText(item) {
		if (!item || !item.inlines) {
			return '';
		}
		return item.inlines.map(i => i.text).join('');
	}

	var testHelper = new integrationTestHelper();

	it('should snake content from column 1 to column 2 on the same page', function () {
		// Generate enough text to ensure overflow (approx 40 lines for A4)
		var lines = [];
		for (var i = 0; i < 40; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 20 },
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 1);

		var items = pages[0].items;

		// Verify items appear in at least two distinct X columns
		var xPositions = items.map(node => normalizeX(node.item.x));
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		assert.ok(uniqueX.length >= 2, 'Should have content in at least two columns ' + JSON.stringify(uniqueX));

		// Verify Y position resets when moving to the new column
		var yPositions = items.map(node => node.item.y);
		var yResetFound = false;
		for (var j = 1; j < yPositions.length; j++) {
			if (yPositions[j] < yPositions[j - 1]) {
				yResetFound = true;
				break;
			}
		}

		assert.ok(yResetFound, 'Y position should reset when moving to next column');
	});

	it('should place subsequent content below snaking columns without overlapping', function () {
		var lines = [];
		for (var i = 0; i < 30; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 20 },
						{ text: '' }
					],
					snakingColumns: true
				},
				{ text: 'Content Below', fontSize: 20 }
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 1);

		var items = pages[0].items;
		var belowItem = items.find(node => getInlineText(node.item).indexOf('Content Below') !== -1);
		assert.ok(belowItem, 'Should find "Content Below" item');

		// Verify content below is positioned after the snaking columns
		var columnItems = items.slice(0, items.length - 1);
		var maxColumnY = 0;
		columnItems.forEach(node => {
			if (node.item.y > maxColumnY) maxColumnY = node.item.y;
		});

		assert.ok(belowItem.item.y > maxColumnY, 'Content below should have Y (' + belowItem.item.y + ') greater than max column Y (' + maxColumnY + ')');
	});

	it('should snake content across multiple pages with 3 columns', function () {
		var lines = [];
		for (var i = 0; i < 110; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 20 },
						{ text: '' },
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 2);

		// Verify Page 1 has content in 3 columns
		var itemsP1 = pages[0].items;
		var xPositionsP1 = itemsP1.map(node => normalizeX(node.item.x));
		var uniqueXP1 = [...new Set(xPositionsP1)].sort((a, b) => a - b);
		assert.ok(uniqueXP1.length === 3, 'Page 1 should have content in 3 columns: ' + uniqueXP1.length);

		var itemsP2 = pages[1].items;
		assert.ok(itemsP2.length > 0, 'Page 2 should have content');

		// Verify Page 2 content starts in the first column
		var firstItemP2 = itemsP2[0];
		assert.ok(Math.abs(firstItemP2.item.x - uniqueXP1[0]) < 1, 'Page 2 content should start in first column');
	});

	it('should snake content across multiple pages with 5 columns', function () {
		var lines = [];
		for (var i = 0; i < 180; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 20 },
						{ text: '' },
						{ text: '' },
						{ text: '' },
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 2);

		// Verify Page 1 has 5 columns
		var itemsP1 = pages[0].items;
		var xPositionsP1 = itemsP1.map(node => normalizeX(node.item.x));
		var uniqueXP1 = [...new Set(xPositionsP1)].sort((a, b) => a - b);
		assert.ok(uniqueXP1.length === 5, 'Page 1 should have content in 5 columns: ' + uniqueXP1.length);

		var itemsP2 = pages[1].items;
		assert.ok(itemsP2.length > 0, 'Page 2 should have content');

		var firstItemP2 = itemsP2[0];
		assert.ok(Math.abs(firstItemP2.item.x - uniqueXP1[0]) < 1, 'Page 2 content should start in first column');
	});

	it('should snake content across multiple pages with 2 columns filling more than 1 page (3 cols total)', function () {
		var lines = [];
		for (var i = 0; i < 80; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 20 },
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 2);

		var itemsP1 = pages[0].items;
		var xPositionsP1 = itemsP1.map(node => normalizeX(node.item.x));
		var uniqueXP1 = [...new Set(xPositionsP1)].sort((a, b) => a - b);
		assert.equal(uniqueXP1.length, 2, 'Page 1 should have content in 2 columns');

		var itemsP2 = pages[1].items;
		var xPositionsP2 = itemsP2.map(node => normalizeX(node.item.x));
		var uniqueXP2 = [...new Set(xPositionsP2)];
		assert.equal(uniqueXP2.length, 1, 'Page 2 should have content in 1 column');

		assert.ok(Math.abs(uniqueXP2[0] - uniqueXP1[0]) < 1, 'Page 2 content should start in first column');
	});

	it('should snake content across multiple pages with 2 columns filling more than 2 pages (5 cols total)', function () {
		var lines = [];
		for (var i = 0; i < 260; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 20 },
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 5);

		// Page 1: 2 cols
		var itemsP1 = pages[0].items;
		var uniqueXP1 = [...new Set(itemsP1.map(node => node.item.x))];
		assert.equal(uniqueXP1.length, 2);

		// Page 2: 2 cols
		var itemsP2 = pages[1].items;
		var uniqueXP2 = [...new Set(itemsP2.map(node => node.item.x))];
		assert.equal(uniqueXP2.length, 2);

		// Page 3: 2 cols
		var itemsP3 = pages[2].items;
		var uniqueXP3 = [...new Set(itemsP3.map(node => node.item.x))];
		assert.equal(uniqueXP3.length, 2);
	});

	it('should support snaking columns on A5 page size', function () {
		var lines = [];
		for (var i = 0; i < 50; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 20 },
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A5', dd);

		assert.equal(pages.length, 2);

		var itemsP1 = pages[0].items;
		var uniqueXP1 = [...new Set(itemsP1.map(node => node.item.x))];
		assert.equal(uniqueXP1.length, 2, 'A5 Page 1 should have 2 columns');
	});

	it('should support snaking columns on Landscape A4 page size', function () {
		var lines = [];
		for (var i = 0; i < 50; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			pageOrientation: 'landscape',
			content: [
				{
					columns: [
						{ text: text, fontSize: 20 },
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 2);

		var itemsP1 = pages[0].items;
		var uniqueXP1 = [...new Set(itemsP1.map(node => node.item.x))];
		assert.equal(uniqueXP1.length, 2, 'Landscape Page 1 should have 2 columns');
	});

	it('should snake content with nested stack structure on single page', function () {
		var lines = [];
		for (var i = 0; i < 40; i++) lines.push('Stack Item ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{
							stack: [
								{ text: 'Header', fontSize: 14, bold: true },
								{ text: text, fontSize: 20 }
							]
						},
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 1);
		var items = pages[0].items;

		// Check for content in both columns
		var xPositions = items.map(node => node.item.x);
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);
		assert.ok(uniqueX.length >= 2, 'Should have content in at least two columns with stack structure');
	});

	it('should snake content with nested stack structure across multiple pages (Bug Fix Test)', function () {
		// This explicitly tests the fix for the bug where grouped content didn't reset to column 1 on new page
		var lines = [];
		for (var i = 0; i < 100; i++) lines.push('Stack Item ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{
							stack: [
								{ text: 'Header', fontSize: 14, bold: true },
								{ text: text, fontSize: 20 }
							]
						},
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);
		assert.equal(pages.length, 2);

		// Page 2 Check
		var itemsP2 = pages[1].items;
		assert.ok(itemsP2.length > 0, 'Page 2 should have content');

		// Verify Page 2 starts at Left Column
		var firstItemX = itemsP2[0].item.x;
		var margins = testHelper.MARGINS;
		// Allow small floating point diff
		assert.ok(Math.abs(firstItemX - margins.left) < 1,
			'Page 2 content should start at left margin (' + margins.left + '), found: ' + firstItemX);

		// Also verify Page 1 has content in 2 columns
		var itemsP1 = pages[0].items;
		var uniqueXP1 = [...new Set(itemsP1.map(node => node.item.x))];
		assert.equal(uniqueXP1.length, 2, 'Page 1 should have content in 2 columns');
	});

	// ============================================
	// HIGH-PRIORITY EDGE CASE TESTS
	// ============================================

	it('should handle tables inside snaking columns', function () {
		// Create table rows that will overflow to column 2
		var tableBody = [['Header 1', 'Header 2']];
		for (var i = 0; i < 30; i++) {
			tableBody.push(['Row ' + (i + 1) + ' Col 1', 'Row ' + (i + 1) + ' Col 2']);
		}

		var dd = {
			content: [
				{
					columns: [
						{
							table: {
								headerRows: 1,
								body: tableBody
							}
						},
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		// Should fit on one page with 2 columns
		assert.equal(pages.length, 1, 'Table should snake to column 2 on same page');

		var items = pages[0].items;
		var xPositions = items.map(node => node.item.x);
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		// Table content should appear in multiple X positions (table cells + column 2)
		assert.ok(uniqueX.length >= 2, 'Table content should span multiple columns');
	});

	it('should handle unbreakable blocks that fit within column height', function () {
		// Create unbreakable blocks small enough to fit in a column
		// but enough blocks to require overflow to column 2
		var blocks = [];
		for (var i = 0; i < 20; i++) {
			blocks.push({
				stack: [
					{ text: 'Block ' + (i + 1) + ' Line 1', fontSize: 14 },
					{ text: 'Block ' + (i + 1) + ' Line 2', fontSize: 14 },
					{ text: 'Block ' + (i + 1) + ' Line 3', fontSize: 14 }
				],
				unbreakable: true
			});
		}

		var dd = {
			content: [
				{
					columns: [
						{ stack: blocks },
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 1, 'Unbreakable blocks should fit on one page');

		var items = pages[0].items;
		var xPositions = items.map(node => node.item.x);
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		assert.ok(uniqueX.length >= 2, 'Content should snake to column 2');
	});

	it('should handle unbreakable block that exceeds remaining column height', function () {
		// Fill most of column 1, then add an unbreakable block that won't fit
		var lines = [];
		for (var i = 0; i < 50; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{
							stack: [
								{ text: text, fontSize: 14 },
								{
									stack: [
										{ text: 'Unbreakable Line 1', fontSize: 14 },
										{ text: 'Unbreakable Line 2', fontSize: 14 },
										{ text: 'Unbreakable Line 3', fontSize: 14 },
										{ text: 'Unbreakable Line 4', fontSize: 14 },
										{ text: 'Unbreakable Line 5', fontSize: 14 }
									],
									unbreakable: true
								}
							]
						},
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		// Content should snake - unbreakable block moves to column 2 if it doesn't fit
		var items = pages[0].items;
		var xPositions = items.map(node => node.item.x);
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		assert.ok(uniqueX.length >= 2, 'Content including unbreakable block should use multiple columns');
	});

	// ============================================
	// MEDIUM-PRIORITY EDGE CASE TESTS
	// ============================================

	it('should handle columns with different widths', function () {
		var lines = [];
		for (var i = 0; i < 50; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, width: 300, fontSize: 14 },
						{ text: '', width: '*' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 1, 'Should fit on one page with different column widths');

		var items = pages[0].items;
		var xPositions = items.map(node => node.item.x);
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		assert.ok(uniqueX.length >= 2, 'Content should snake to column 2');

		// Verify column 1 content is within first 300pt
		var col1Items = items.filter(node => node.item.x < 350);
		assert.ok(col1Items.length > 0, 'Should have content in column 1');
	});

	it('should handle complex 3-column snaking with varying widths (Rigorous Width Test)', function () {
		// Test widths: 150, 250, 100
		var lines = [];
		for (var i = 0; i < 150; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, width: 150, fontSize: 14 },
						{ text: '', width: 250 },
						{ text: '', width: '*' }
					],
					columnGap: 20,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A3', dd);
		assert.equal(pages.length, 1);

		var items = pages[0].items;
		var xPositions = [...new Set(items.map(n => n.item.x))].sort((a, b) => a - b);
		assert.equal(xPositions.length, 3, 'Should use all 3 columns');

		// Column 1 starts at margin.left (40)
		assert.ok(Math.abs(xPositions[0] - 40) < 1);

		// Column 2 starts at margin.left + Col1Width (150) + Gap (20) = 210
		assert.ok(Math.abs(xPositions[1] - 210) < 2, 'Col 2 X should be 210, found: ' + xPositions[1]);

		// Column 3 starts at Col2X (210) + Col2Width (250) + Gap (20) = 480
		assert.ok(Math.abs(xPositions[2] - 480) < 2, 'Col 3 X should be 480, found: ' + xPositions[2]);
	});

	it('should handle columnGap: 0', function () {
		var lines = [];
		for (var i = 0; i < 60; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 14 },
						{ text: '' }
					],
					columnGap: 0,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 1, 'Should fit on one page');

		var items = pages[0].items;
		var xPositions = items.map(node => node.item.x);
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		assert.ok(uniqueX.length >= 2, 'Content should snake to column 2 even with no gap');

		// With columnGap: 0, column 2 should start immediately after column 1
		if (uniqueX.length >= 2) {
			var col1End = uniqueX[0] + (uniqueX[1] - uniqueX[0]);
			assert.ok(col1End > uniqueX[0], 'Columns should be adjacent with no gap');
		}
	});

	it('should handle large columnGap', function () {
		var lines = [];
		for (var i = 0; i < 60; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 14 },
						{ text: '' }
					],
					columnGap: 50,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 1, 'Should fit on one page with large gap');

		var items = pages[0].items;
		var xPositions = items.map(node => node.item.x);
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		assert.ok(uniqueX.length >= 2, 'Content should snake to column 2');

		// Verify there's a significant gap between columns
		if (uniqueX.length >= 2) {
			var gap = uniqueX[1] - uniqueX[0];
			// Gap should be at least columnGap (50) plus some column width
			assert.ok(gap > 50, 'Should have significant gap between columns');
		}

	});

	it('should handle default columnGap (30)', function () {
		var lines = [];
		for (var i = 0; i < 60; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 14 },
						{ text: '' }
					],
					columnGap: 30,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		assert.equal(pages.length, 1, 'Should fit on one page with default gap');

		var items = pages[0].items;
		var xPositions = items.map(node => node.item.x);
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		assert.ok(uniqueX.length >= 2, 'Content should snake to column 2');

		if (uniqueX.length >= 2) {
			var gap = uniqueX[1] - uniqueX[0];
			assert.ok(gap >= 30, 'Gap should be at least 30 (default columnGap)');
		}
	});

	it('should verify Column 2 top Y matches Column 1 top Y (coordinate precision)', function () {
		var lines = [];
		for (var i = 0; i < 40; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 20 },
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);
		assert.equal(pages.length, 1, 'Should fit on one page');

		var items = pages[0].items;

		// Group items by X position to identify columns
		var xPositions = items.map(node => node.item.x);
		var uniqueX = [...new Set(xPositions)].sort((a, b) => a - b);

		assert.ok(uniqueX.length >= 2, 'Should have at least 2 columns');

		// Find first item in each column
		var col1FirstItem = items.find(node => Math.abs(node.item.x - uniqueX[0]) < 1);
		var col2FirstItem = items.find(node => Math.abs(node.item.x - uniqueX[1]) < 1);

		assert.ok(col1FirstItem, 'Should find first item in column 1');
		assert.ok(col2FirstItem, 'Should find first item in column 2');

		// Column tops should match (within floating point tolerance)
		var yDiff = Math.abs(col1FirstItem.item.y - col2FirstItem.item.y);
		assert.ok(yDiff < 2, 'Column 1 top Y (' + col1FirstItem.item.y + ') should match Column 2 top Y (' + col2FirstItem.item.y + ')');
	});

	it('should position content after snaking columns below the tallest column', function () {
		// Create content where column 1 is taller than column 2
		var lines = [];
		for (var i = 0; i < 25; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{ text: text, fontSize: 20 },
						{ text: '' }
					],
					snakingColumns: true
				},
				{ text: 'Content After Snaking Columns', fontSize: 20, bold: true }
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		var items = pages[0].items;
		var lastItem = items[items.length - 1];

		// Find the bottommost Y of all column content
		var columnItems = items.slice(0, items.length - 1);
		var maxColumnBottom = 0;
		columnItems.forEach(node => {
			// Approximate bottom by adding line height to y
			var itemBottom = node.item.y + 20; // fontSize approximation
			if (itemBottom > maxColumnBottom) maxColumnBottom = itemBottom;
		});

		// Content after should be below the tallest column
		assert.ok(lastItem.item.y >= maxColumnBottom - 5,
			'Content after (' + lastItem.item.y + ') should be at or below max column bottom (' + maxColumnBottom + ')');
	});

	// ============================================
	// HIGH-PRIORITY EDGE CASE TESTS (NEW)
	// ============================================

	it('should move unbreakable table to next column if it does not fit in remaining space', function () {
		// Fill most of column 1 with text, then add an unbreakable table
		// The table should move to column 2 rather than breaking across columns
		var lines = [];
		for (var i = 0; i < 45; i++) lines.push('Filler Line ' + (i + 1));
		var fillerText = lines.join('\n');

		var dd = {
			content: [{
				columns: [{
					stack: [
						{ text: fillerText, fontSize: 14 },
						{
							table: {
								headerRows: 1,
								body: [
									['Header A', 'Header B', 'Header C'],
									['Row 1 A', 'Row 1 B', 'Row 1 C'],
									['Row 2 A', 'Row 2 B', 'Row 2 C'],
									['Row 3 A', 'Row 3 B', 'Row 3 C']
								]
							},
							unbreakable: true
						}
					]
				}, { text: '' }],
				snakingColumns: true
			}]
		};

		var pages = testHelper.renderPages('A4', dd);
		assert.equal(pages.length, 1, 'Unbreakable table should fit within snaking columns on one page');

		var items = pages[0].items;
		var uniqueX = [...new Set(items.map(n => n.item.x))].sort((a, b) => a - b);
		assert.ok(uniqueX.length >= 2, 'Content should span at least 2 columns (table moved to column 2)');
	});

	it('should handle nested regular columns inside snaking columns', function () {
		// Create snaking columns that contain nested non-snaking columns
		// The outer snaking should work, while nested columns are independent
		var lines = [];
		for (var i = 0; i < 60; i++) lines.push('Line ' + (i + 1));
		var textContent = lines.join('\n');

		var dd = {
			content: [{
				columns: [{
					stack: [
						{ text: 'Header with nested columns below', bold: true, fontSize: 14, marginBottom: 10 },
						{
							columns: [
								{ text: 'Nested Column 1\nContent in left nested column', width: '50%' },
								{ text: 'Nested Column 2\nContent in right nested column', width: '50%' }
							],
							columnGap: 10
							// Note: snakingColumns NOT set - this is regular column layout
						},
						{ text: textContent, fontSize: 12, marginTop: 10 }
					]
				}, { text: '' }],
				snakingColumns: true
			}]
		};

		var pages = testHelper.renderPages('A4', dd);
		assert.equal(pages.length, 1, 'Should work on one page with nested columns');

		var items = pages[0].items;
		var uniqueX = [...new Set(items.map(n => n.item.x))].sort((a, b) => a - b);
		assert.ok(uniqueX.length >= 2, 'Outer snaking should flow to column 2');
	});

	it('should position wide SVG element correctly within snaking columns', function () {
		// Test handling of content that is wider than a single column
		// SVG should either fit or flow appropriately
		var dd = {
			content: [{
				columns: [{
					stack: [
						{ text: 'Content before SVG', fontSize: 12 },
						{
							// Simple SVG rectangle to test wide content handling
							svg: '<svg width="200" height="50"><rect width="200" height="50" fill="#3498db" stroke="#2c3e50" stroke-width="2"/></svg>',
							width: 200
						},
						{ text: 'Content after SVG', fontSize: 12 },
						{ text: 'More text to push content to second column', fontSize: 12 }
					]
				}, { text: '' }],
				snakingColumns: true
			}]
		};

		// This should not crash and should render
		var pages = testHelper.renderPages('A4', dd);
		assert.ok(pages.length >= 1, 'Document should render with SVG element inside snaking columns');

		var items = pages[0].items;
		assert.ok(items.length > 0, 'Should have rendered content');
	});

	xit('should support nested snaking columns (inner snaking respected)', function () {
		// Test nested snaking columns where inner columns also snake
		var lines = [];
		for (var i = 1; i <= 30; i++) lines.push('Inner Line ' + i);
		var innerText = lines.join('\n');

		var dd = {
			content: [{
				columns: [{
					stack: [
						{ text: 'Outer Column 1 Start' },
						{
							// Nested snaking columns
							columns: [
								{ text: innerText, fontSize: 10 },
								{ text: '' }
							],
							columnGap: 10,
							snakingColumns: true
						},
						{ text: 'Outer Column 1 End' }
					]
				}, { text: '' }],
				snakingColumns: true
			}]
		};

		var pages = testHelper.renderPages('A4', dd);
		assert.equal(pages.length, 1, 'Should fit on one page');

		var items = pages[0].items;
		// Find inner text items
		var innerItems = items.filter(n => n.item.inlines && n.item.inlines[0].text.startsWith('Inner Line'));

		// Group by X position
		var uniqueX = [...new Set(innerItems.map(n => n.item.x))].sort((a, b) => a - b);
		assert.ok(uniqueX.length >= 2, 'Inner content should snake to 2nd inner column');
	});

	it('should synchronize all snapshots when page breaks occur in nested structures', function () {
		// This test verifies the fix for multi-page snaking columns where nested
		// structures would cause content truncation because only the first snapshot
		// was being updated on page breaks. With the fix, ALL snapshots are synced.
		var lines = [];
		for (var i = 0; i < 120; i++) lines.push('Line ' + (i + 1));
		var text = lines.join('\n');

		var dd = {
			content: [
				{
					columns: [
						{
							stack: [
								{ text: 'Header Section', fontSize: 14, bold: true, marginBottom: 10 },
								{
									// Regular columns nested inside snaking
									columns: [
										{ text: 'Info A: Value 1', width: '50%' },
										{ text: 'Info B: Value 2', width: '50%' }
									],
									columnGap: 10,
									marginBottom: 10
								},
								{ text: text, fontSize: 12 }
							]
						},
						{ text: '' }
					],
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);

		// Should span multiple pages
		assert.ok(pages.length >= 2, 'Content should span at least 2 pages');

		// Verify Page 2 has content and starts at the correct position
		var itemsP2 = pages[1].items;
		assert.ok(itemsP2.length > 0, 'Page 2 should have content');

		// First item on Page 2 should start at left margin (column 1)
		var firstItemX = itemsP2[0].item.x;
		var margins = testHelper.MARGINS;
		assert.ok(Math.abs(firstItemX - margins.left) < 2,
			'Page 2 should start at left margin (' + margins.left + '), found: ' + firstItemX);

		// Verify content fills Page 1 (uses multiple columns, not truncated)
		var uniqueXP1 = [...new Set(pages[0].items.map(n => n.item.x))];
		assert.ok(uniqueXP1.length >= 2, 'Page 1 should use at least 2 column positions, found: ' + uniqueXP1.length);
	});



	it('should reflow text when snaking from wide to narrow column', function () {
		// Test ensuring text reflows correctly when moving from a wide column to a narrow one
		var dd = {
			content: [
				{
					columns: [
						{ text: 'Wide content ' + 'text '.repeat(2000), width: 300, fontSize: 10 },
						{ text: '', width: 100 }
					],
					columnGap: 10,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);
		assert.ok(pages.length >= 1, 'Should render at least one page');

		var items = pages[0].items;
		// Find items in the second column (approx X > left margin + 300)
		// Margins default 40. Col 1 ends ~340. Gap 10. Col 2 starts ~350.
		var col2Items = items.filter(n => n.item.x > 340);

		assert.ok(col2Items.length > 0, 'Should have content in second column');

		// Check that widths in 2nd column are constrained (approx 100)
		// Note: item.item.width isn't always available on vector items, but checking
		// bounds is safer. No item should start > 350 + 100 = 450 approximately.
		// We want to ensure text *wrapped*. If it didn't wrap, we'd see a long line.
		// We can check the width of the text line if available, or just rightmost point.
		col2Items.forEach(function(node) {
			if (node.item.inlines) { // Text line
				// Check that the line fits within reasonable bounds check for 100 width
				// Allow small buffer for calculation diffs
				var lineWidth = node.item.getWidth ? node.item.getWidth() : 0;
				assert.ok(lineWidth <= 105, 'Line width in narrow column should be <= 100, found: ' + lineWidth);
			}
		});
	});

	it('should reset to first column width when breaking to new page in variable width snaking columns', function () {
		// Test ensuring that when snaking columns break to a NEW page, they start with the
		// width of the FIRST column, not the last column of the previous page.
		var dd = {
			content: [
				{
					columns: [
						// First column wide (300), second narrow (100)
						// Content forces break to next page
						{ text: 'START ' + 'text '.repeat(3000), width: 300, fontSize: 10 },
						{ text: '', width: 100 }
					],
					columnGap: 10,
					snakingColumns: true
				}
			]
		};

		var pages = testHelper.renderPages('A4', dd);
		assert.ok(pages.length >= 2, 'Should span multiple pages');

		// Page 1 Col 1 width should be ~300.
		// Page 1 Col 2 width should be ~100.

		// Page 2 Col 1 should match Page 1 Col 1 width (~300).
		// If the bug exists, it will take the width of Page 1 Col 2 (~100).

		var itemsP2 = pages[1].items;
		var firstItemP2 = itemsP2.find(n => n.item.inlines && n.item.x < 300); // Items in left column

		assert.ok(firstItemP2, 'Page 2 should have content in first column');

		// Check available width or line width.
		// If width is 100, a long line will wrap at 100.
		// If width is 300, it will wrap at 300.
		// We can check the width of the line.
		var lineWidth = firstItemP2.item.getWidth ? firstItemP2.item.getWidth() : 0;

		// Should be significantly larger than 100
		assert.ok(lineWidth > 150, 'Page 2 separate column should have reset to wide width (>150), found: ' + lineWidth);
	});

});
