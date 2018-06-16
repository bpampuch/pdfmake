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

	/**
	 * This should test any case in which function addPageItem is called with
	 * defined index. This includes but might not be limited to:
	 * - Vectors
	 * - Qr
	 * - Lists
	 * - Tables
	 * - Images
	 * - Leafs
	 */
	it('background elements remain at the bottom of item list on every page', function () {
		var dd = {
			background: function () {
				return [
					{
						canvas: [
							{
								type: 'rect',
								x: 0,
								y: 0,
								w: 50,
								h: 50,
								color: 'red'
							},
							{
								type: 'rect',
								x: 0,
								y: 0,
								w: 50,
								h: 50,
								color: 'green'
							},
							{
								type: 'rect',
								x: 0,
								y: 0,
								w: 50,
								h: 50,
								color: 'blue'
							}
						]
					}
				];
			},
			content: [
				{
					table: {
						body: [
							[
								{
									text: 'a',
									fillColor: '#aaa'
								},
								{
									text: 'b',
									fillColor: '#bbb'
								},
								{
									text: 'c',
									fillColor: '#ccc'
								}
							]
						]
					}
				},
				{
					qr: 'qr',
					foreground: 'red',
					background: 'yellow'
				},
				{
					ul: [
						'List 1',
						'List 2',
						'List 3'
					]
				},
				{
					image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
				},
				{
					text: 'Leaf',
					pageBreak: 'after'
				},
				{
					table: {
						body: [
							[
								{
									text: 'a',
									fillColor: '#aaa'
								},
								{
									text: 'b',
									fillColor: '#bbb'
								},
								{
									text: 'c',
									fillColor: '#ccc'
								}
							]
						]
					}
				}
			]
		};
		var pages = testHelper.renderPages('A6', dd);
		assert.equal(pages.length, 2);
		var first = pages[0].items[0].item;
		var second = pages[0].items[1].item;
		var third = pages[0].items[2].item;
		var first2 = pages[1].items[0].item;
		var second2 = pages[1].items[1].item;
		var third2 = pages[1].items[2].item;
		assert.equal(first.color, 'red');
		assert.equal(second.color, 'green');
		assert.equal(third.color, 'blue');
		assert.equal(first2.color, 'red');
		assert.equal(second2.color, 'green');
		assert.equal(third2.color, 'blue');
	});

});
