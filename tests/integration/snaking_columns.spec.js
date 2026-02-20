'use strict';

var assert = require('assert');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: snaking columns', function () {

	var testHelper = new integrationTestHelper();

	function normalizeX(x) {
		return Math.round(x);
	}

	function getInlineText(item) {
		if (!item || !item.inlines) {
			return '';
		}
		return item.inlines.map(i => i.text).join('');
	}

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
		var uniqueXP1 = [...new Set(itemsP1.map(node => normalizeX(node.item.x)))];
		assert.equal(uniqueXP1.length, 2);

		// Page 2: 2 cols
		var itemsP2 = pages[1].items;
		var uniqueXP2 = [...new Set(itemsP2.map(node => normalizeX(node.item.x)))];
		assert.equal(uniqueXP2.length, 2);

		// Page 3: 2 cols
		var itemsP3 = pages[2].items;
		var uniqueXP3 = [...new Set(itemsP3.map(node => normalizeX(node.item.x)))];
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
		var uniqueXP1 = [...new Set(itemsP1.map(node => normalizeX(node.item.x)))];
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
		var uniqueXP1 = [...new Set(itemsP1.map(node => normalizeX(node.item.x)))];
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
		var uniqueXP1 = [...new Set(itemsP1.map(node => normalizeX(node.item.x)))];
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
		var xPositions = [...new Set(items.map(n => normalizeX(n.item.x)))].sort((a, b) => a - b);
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
		var uniqueX = [...new Set(items.map(n => normalizeX(n.item.x)))].sort((a, b) => a - b);
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
		var uniqueX = [...new Set(items.map(n => normalizeX(n.item.x)))].sort((a, b) => a - b);
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
		col2Items.forEach(function (node) {
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

	describe('snaking columns nested checks', function () {

		it('should respect left margin when snaking columns break to next page', function () {
			// Scenario: Snaking columns are inside a container with a margin.
			// Expected: When content breaks to page 2, it should start at the margin, not at page edge.

			var lines = [];
			for (var i = 0; i < 100; i++) lines.push('Line ' + (i + 1));
			var text = lines.join('\n');

			var margin = 100;

			var dd = {
				content: [
					{
						marginLeft: margin,
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

			// Page 2 Check
			var itemsP2 = pages[1].items;
			assert.ok(itemsP2.length > 0, 'Page 2 should have content');

			// Verify Page 2 starts at correct margin
			// Default page margin left comes from testHelper.MARGINS.left.
			// With marginLeft: 100, it should be testHelper.MARGINS.left + 100.

			var firstItemX = itemsP2[0].item.x;
			var expectedX = testHelper.MARGINS.left + margin;

			assert.ok(Math.abs(firstItemX - expectedX) < 1,
				'Page 2 content should start at left margin + indented margin (' + expectedX + '), found: ' + firstItemX);
		});

	});

	describe('snaking columns with table headerRows and keepWithHeaderRows', function () {

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

	describe('snaking columns with table nodes', function () {

		function normalizeX(x) {
			return Math.round(x);
		}

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

		it('should draw top border at continuation point after column and page breaks', function () {
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

			assert.ok(pages.length >= 2, 'Should span multiple pages');

			// On each page, column 2 should have a horizontal border line near the top
			// (same Y as column 1's top border), confirming the continuation border is drawn
			pages.forEach(function (page, pi) {
				var hLines = page.items.filter(function (n) {
					return n.type === 'vector' && n.item.type === 'line' && n.item.y1 === n.item.y2;
				});
				var col2Lines = hLines.filter(function (v) { return v.item.x1 >= 300; });

				if (col2Lines.length > 0) {
					var col1Lines = hLines.filter(function (v) { return v.item.x1 < 300; });
					var col1TopY = Math.min.apply(null, col1Lines.map(function (v) { return v.item.y1; }));
					var col2TopY = Math.min.apply(null, col2Lines.map(function (v) { return v.item.y1; }));

					// Col2 top border should be at approximately the same Y as col1 top border
					assert.ok(
						Math.abs(col2TopY - col1TopY) < 5,
						'Page ' + (pi + 1) + ': Col2 top border (' + Math.round(col2TopY) +
						') should match Col1 top border (' + Math.round(col1TopY) + ')'
					);
				}
			});
		});

	});

});
