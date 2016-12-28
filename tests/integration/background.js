/* jslint node: true */
'use strict';

var assert = require('assert');
var _ = require('lodash');

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: background', function () {

	var testHelper = new integrationTestHelper();

	it('renders on every page', function () {
		var dd = {
			background: function (page) {
				return [
					'Background paragraph on page ' + page
				];
			},
			content: [
				'First page',
				'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n',
				'Another Page'
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 2);

		var backgroundPage1 = pages[0].items[0].item;
		assert.equal(_.map(backgroundPage1.inlines, 'text').join(''), 'Background paragraph on page 1');
		assert.equal(backgroundPage1.x, 0);
		assert.equal(backgroundPage1.y, 0);

		var backgroundPage2 = pages[1].items[0].item;
		assert.equal(_.map(backgroundPage2.inlines, 'text').join(''), 'Background paragraph on page 2');
		assert.equal(backgroundPage2.x, 0);
		assert.equal(backgroundPage2.y, 0);
	});

});
