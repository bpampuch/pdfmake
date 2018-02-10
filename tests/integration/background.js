'use strict';

var assert = require('assert');

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
		assert.equal(backgroundPage1.inlines.map(node => node.text).join(''), 'Background paragraph on page 1');
		assert.equal(backgroundPage1.x, 0);
		assert.equal(backgroundPage1.y, 0);

		var backgroundPage2 = pages[1].items[0].item;
		assert.equal(backgroundPage2.inlines.map(node => node.text).join(''), 'Background paragraph on page 2');
		assert.equal(backgroundPage2.x, 0);
		assert.equal(backgroundPage2.y, 0);
	});

	it('table fillColor must be above background', function () {
		var dd = {
			background: function () {
				return [
					'Background paragraph'
				];
			},
			content: [
				{
					table: {
						body: [
							[
								{
									text: '\n',
									fillColor: '#7d02c9'
								}
							]
						]
					}
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var fillColorRect = pages[0].items[1].item;
		var backgroundPage = pages[0].items[0].item;

		assert.equal(backgroundPage.inlines.map(node => node.text).join(''), 'Background paragraph');
		assert.equal(fillColorRect.type, 'rect');
		assert.equal(fillColorRect.color, '#7d02c9');
	});

});
