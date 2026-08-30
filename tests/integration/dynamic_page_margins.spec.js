'use strict';

var assert = require('assert');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: dynamicPageMargins', function () {

	var testHelper;

	beforeEach(function () {
		testHelper = new integrationTestHelper();
	});

	it('applies different bottom margins per page for footer sizing', function () {
		var footerBottomMargin = 100;
		var dd = {
			content: [
				'First page content',
			],
			pageMargins: function (currentPage, pageCount) {
				if (currentPage === pageCount) {
					return { left: 40, top: 40, right: 40, bottom: footerBottomMargin };
				}
				return { left: 40, top: 40, right: 40, bottom: 40 };
			},
			footer: function (currentPage, pageCount) {
				if (currentPage === pageCount) {
					return { text: 'Footer on last page' };
				}
				return null;
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);
		// The last page should have the dynamic bottom margin applied
		assert.equal(pages[0].pageMargins.bottom, footerBottomMargin);
	});

	it('only applies large margin on the last page when multiple pages exist', function () {
		// Generate enough content for multiple pages on A7
		var lines = [];
		for (var i = 0; i < 20; i++) {
			lines.push('Line ' + i + ' with some text to fill the page');
		}

		var dd = {
			content: lines,
			pageMargins: function (currentPage, pageCount) {
				if (currentPage === pageCount) {
					return { left: 40, top: 40, right: 40, bottom: 120 };
				}
				return { left: 40, top: 40, right: 40, bottom: 40 };
			},
			footer: function (currentPage, pageCount) {
				if (currentPage === pageCount) {
					return { text: 'Footer text' };
				}
				return null;
			}
		};

		var pages = testHelper.renderPages('A7', dd);

		assert(pages.length >= 2, 'Should have at least 2 pages');

		// At least one page should have the large bottom margin applied
		var hasLargeMargin = pages.some(function (p) { return p.pageMargins.bottom === 120; });
		assert(hasLargeMargin, 'At least one page should have large bottom margin');
	});

	it('accepts array format from dynamicPageMargins', function () {
		var dd = {
			content: ['Some content'],
			pageMargins: function () {
				return { left: 40, top: 40, right: 40, bottom: 150 };
			},
			footer: function () {
				return { text: 'Footer' };
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);
		assert.equal(pages[0].pageMargins.bottom, 150);
		assert.equal(pages[0].pageMargins.left, 40);
	});

	it('receives pageSize in pageMargins callback', function () {
		var receivedPageSize = null;
		var dd = {
			content: ['Content'],
			pageMargins: function (currentPage, pageCount, pageSize) {
				receivedPageSize = pageSize;
				return { left: 40, top: 40, right: 40, bottom: 40 };
			},
			footer: function () {
				return { text: 'Footer' };
			}
		};

		testHelper.renderPages('A6', dd);

		assert.notEqual(receivedPageSize, null, 'pageSize should be passed to pageMargins');
		assert(receivedPageSize.width > 0, 'pageSize.width should be positive');
		assert(receivedPageSize.height > 0, 'pageSize.height should be positive');
	});

	it('repositions table headers and continued cell content on each page', function () {
		var body = [[{ text: 'H1' }, { text: 'H2' }, { text: 'H3' }]];

		for (var i = 0; i < 10; i++) {
			body.push([
				'row ' + i + ' aaa bbb ccc ddd eee fff ggg hhh iii',
				'cell ' + i + ' aaa bbb ccc ddd eee fff ggg hhh iii',
				'third ' + i + ' aaa bbb ccc ddd eee fff ggg hhh iii'
			]);
		}

		var dd = {
			content: [
				{
					table: {
						headerRows: 1,
						widths: ['*', '*', '*'],
						body: body
					}
				}
			],
			pageMargins: function (currentPage) {
				return {
					left: currentPage % 2 === 0 ? 100 : 20,
					top: 20,
					right: currentPage % 2 === 0 ? 20 : 100,
					bottom: 20
				};
			}
		};

		var pages = testHelper.renderPages('A7', dd);
		var page1Lines = pages[0].items.filter(function (item) { return item.type === 'line'; }).map(function (item) { return item.item; });
		var page2Lines = pages[1].items.filter(function (item) { return item.type === 'line'; }).map(function (item) { return item.item; });
		var page2Vectors = pages[1].items.filter(function (item) { return item.type === 'vector'; }).map(function (item) { return item.item; });
		var page2BodyVerticalLine = page2Vectors.find(function (item) {
			return item.x1 === item.x2 && item.y1 > 40;
		});

		assert(pages.length > 1, 'table should span multiple pages');
		assert.equal(page1Lines[0].x, 25);
		assert.equal(page2Lines[0].x, 105);
		assert.equal(page2Lines[3].x, 105);
		assert(page2BodyVerticalLine, 'page 2 should have a vertical border for the broken row');
		assert.equal(page2BodyVerticalLine.x1, 100.5);
	});

	it('applies the requested right margin to table borders on alternating pages', function () {
		var body = [[{ text: 'H1' }, { text: 'H2' }, { text: 'H3' }]];

		for (var i = 0; i < 40; i++) {
			body.push([
				'row ' + i,
				'cell ' + i,
				'third ' + i
			]);
		}

		var dd = {
			content: [
				{
					table: {
						headerRows: 1,
						widths: ['33%', '33%', '34%'],
						body: body
					}
				}
			],
			pageMargins: function (currentPage) {
				return {
					left: currentPage % 2 === 0 ? 100 : 20,
					top: 20,
					right: currentPage % 2 === 0 ? 20 : 100,
					bottom: 20
				};
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		function remainingRightSpace(page) {
			var vectors = page.items.filter(function (item) { return item.type === 'vector'; }).map(function (item) { return item.item; });
			var maxX = vectors.reduce(function (max, vector) {
				return Math.max(max, vector.x2 || vector.x1 || vector.x || 0);
			}, 0);

			return page.pageSize.width - maxX;
		}

		assert(Math.abs(remainingRightSpace(pages[0]) - (pages[0].pageMargins.right + 0.5)) < 0.01);
		assert(Math.abs(remainingRightSpace(pages[1]) - (pages[1].pageMargins.right + 0.5)) < 0.01);
	});

	it('does not draw reversed carry-over borders for fixed-height rows that break across pages', function () {
		var filler = [];
		for (var i = 0; i < 15; i++) {
			filler.push('filler line ' + i + ' lorem ipsum dolor sit amet consectetur');
		}

		var dd = {
			content: filler.concat([
				{ text: 'Defining row heights', style: 'subheader' },
				{
					table: {
						heights: [20, 50, 70],
						body: [
							['row 1 with height 20', 'column B'],
							['row 2 with height 50', 'column B'],
							['row 3 with height 70', 'column B']
						]
					}
				},
				'With same height:'
			]),
			styles: {
				subheader: {
					fontSize: 16,
					bold: true,
					margin: [0, 10, 0, 5]
				}
			},
			pageMargins: function (currentPage) {
				return {
					left: currentPage % 2 === 0 ? 100 : 20,
					top: 20,
					right: currentPage % 2 === 0 ? 20 : 200,
					bottom: 20
				};
			}
		};

		var pages = testHelper.renderPages('A6', dd);

		function linesOf(page) {
			return page.items
				.filter(function (item) { return item.type === 'line'; })
				.map(function (item) { return item.item; });
		}

		var textPage = pages.find(function (page) {
			return linesOf(page).some(function (line) {
				return line.inlines[0] && line.inlines[0].text.indexOf('With') === 0;
			});
		});
		var textLine = linesOf(textPage).find(function (line) {
			return line.inlines[0].text.indexOf('With') === 0;
		});
		var reversedVerticalLine = pages.reduce(function (found, page) {
			return found || page.items
				.filter(function (item) { return item.type === 'vector'; })
				.map(function (item) { return item.item; })
				.find(function (item) { return item.type === 'line' && item.x1 === item.x2 && item.y1 > item.y2; });
		}, undefined);

		// The text that follows the table starts at the left margin of whichever
		// page it lands on, and no page carries a border drawn bottom-to-top.
		assert(textPage, 'text after the table should be rendered');
		assert.equal(textLine.x, textPage.pageMargins.left);
		assert.equal(reversedVerticalLine, undefined);
	});

	it('warns when pageCount-dependent margins oscillate', function () {
		var lines = [];
		var calls = [];
		var warnings = [];
		var originalWarn = console.warn;

		for (var i = 0; i < 5; i++) {
			lines.push('Line ' + i + ' with some text to fill the page and change pagination.');
		}

		var dd = {
			content: lines,
			pageMargins: function (currentPage, pageCount) {
				calls.push({ currentPage: currentPage, pageCount: pageCount });

				if (pageCount % 2 === 1) {
					return { left: 40, top: 40, right: 40, bottom: 140 };
				}

				return { left: 40, top: 40, right: 40, bottom: 40 };
			}
		};

		console.warn = function (message) {
			warnings.push(message);
		};

		try {
			var pages = testHelper.renderPages('A7', dd);
			var distinctAssumptions = new Set(calls.map(function (call) { return call.pageCount; }));

			assert(pages.length > 0, 'layout should still complete');
			assert(distinctAssumptions.has(1), 'should try a 1-page assumption');
			assert(distinctAssumptions.has(2), 'should try a 2-page assumption');
			assert(calls.length > 4, 'should continue retrying after warning under the current policy');
			assert.equal(warnings.length, 1, 'should warn exactly once');
			assert(/Non-convergent dynamic pageMargins/.test(warnings[0]));
		} finally {
			console.warn = originalWarn;
		}
	});
});
