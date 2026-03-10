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
});
