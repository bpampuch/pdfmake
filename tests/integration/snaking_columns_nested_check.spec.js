'use strict';

var assert = require('assert');
var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: snaking columns nested checks', function () {

	var testHelper = new integrationTestHelper();

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
