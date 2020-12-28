'use strict';

var assert = require('assert');

var integrationTestHelper = require('./integrationTestHelper');
var SVGMeasure = require('../../js/SVGMeasure').default;

// NOTE: more tests for SVGMeasure in ../SVGMeasure.js

describe('Integration Test: svg\'s', function () {

	var testHelper = new integrationTestHelper();

	var INLINE_TEST_SVG = '<svg viewBox="0 0 500 500"><circle cx="250" cy="250" r="100" stroke="black" stroke-width="3" fill="red" /></svg>';

	describe('basics', function () {
		it('renders next element below svg', function () {
			var svgHeight = 150;
			var dd = {
				content: [
					{
						svg: INLINE_TEST_SVG,
						height: svgHeight
					},
					'some Text'
				]
			};

			var pages = testHelper.renderPages('A6', dd);

			assert.equal(pages.length, 1);

			var svg = pages[0].items[0].item;
			var someElementAfterSvg = pages[0].items[1].item;

			assert.equal(svg.x, testHelper.MARGINS.left);
			assert.equal(svg.y, testHelper.MARGINS.top);
			assert.equal(someElementAfterSvg.x, testHelper.MARGINS.left);
			assert.equal(someElementAfterSvg.y, testHelper.MARGINS.top + svgHeight);
		});

		it('renders svg below text', function () {
			var svgHeight = 150;
			var dd = {
				content: [
					'some Text',
					{
						svg: INLINE_TEST_SVG,
						height: svgHeight
					}
				]
			};

			var pages = testHelper.renderPages('A6', dd);

			assert.equal(pages.length, 1);

			var someElementBeforeSvg = pages[0].items[0].item;
			var image = pages[0].items[1].item;


			assert.equal(someElementBeforeSvg.x, testHelper.MARGINS.left);
			assert.equal(someElementBeforeSvg.y, testHelper.MARGINS.top);

			assert.equal(image.x, testHelper.MARGINS.left);
			assert.equal(image.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);
		});
	});

	describe('dimensions', function () {

		var svgMeasure = new SVGMeasure();

		it('reads height and width from svg', function () {
			var dd = {
				content: [
					{
						svg: '<svg width="200" height="100" viewBox="0 0 600 300"></svg>',
					}
				]
			};

			var pages = testHelper.renderPages('A6', dd);

			var svgNode = pages[0].items[0].item;

			assert.equal(svgNode._width, 200);
			assert.equal(svgNode._height, 100);
		});

		it('reads height and width from svg (decimals)', function () {
			var dd = {
				content: [
					{
						svg: '<svg width="200.15" height="100.35" viewBox="0 0 600 300"></svg>',
					}
				]
			};

			var pages = testHelper.renderPages('A6', dd);

			var svgNode = pages[0].items[0].item;

			assert.equal(Number(svgNode._width).toFixed(2), 200.15);
			assert.equal(Number(svgNode._height).toFixed(2), 100.35);
		});

		it('reads height and width from viewBox', function () {
			var dd = {
				content: [
					{
						svg: '<svg viewBox="0 0 600 300"></svg>',
					}
				]
			};

			var pages = testHelper.renderPages('A6', dd);

			var svgNode = pages[0].items[0].item;

			assert.equal(svgNode._width, 600);
			assert.equal(svgNode._height, 300);
		});

		it('reads height and width from viewBox (decimals)', function () {
			var dd = {
				content: [
					{
						svg: '<svg viewBox="0 0 600.10 300.20"></svg>',
					}
				]
			};

			var pages = testHelper.renderPages('A6', dd);

			var svgNode = pages[0].items[0].item;

			assert.equal(Number(svgNode._width).toFixed(2), 600.10);
			assert.equal(Number(svgNode._height).toFixed(2), 300.20);
		});

		it('writes width and height from definition to svg', function () {
			var dd = {
				content: [
					{
						svg: '<svg width="200" height="100" viewBox="0 0 600 300"></svg>',
						width: 400,
						height: 800
					}
				]
			};

			var pages = testHelper.renderPages('A6', dd);

			var svgNode = pages[0].items[0].item;
			var svgDimensions = svgMeasure.measureSVG(svgNode.svg);

			assert.equal(svgDimensions.width, 400);
			assert.equal(svgDimensions.height, 800);
		});

		it('writes width and height from definition to svg (decimals)', function () {
			var dd = {
				content: [
					{
						svg: '<svg width="200" height="100" viewBox="0 0 600 300"></svg>',
						width: 400.15,
						height: 800.35
					}
				]
			};

			var pages = testHelper.renderPages('A6', dd);

			var svgNode = pages[0].items[0].item;
			var svgDimensions = svgMeasure.measureSVG(svgNode.svg);

			assert.equal(svgDimensions.width, 400.15);
			assert.equal(svgDimensions.height, 800.35);
		});

		it('writes svg in header', function () {
			var dd = {
				content: [],
				header: {
					svg: '<svg width="200" height="100" viewBox="0 0 600 300"></svg>',
				}
			};

			var pages = testHelper.renderPages('A6', dd);
			assert.equal(pages[0].items[0].type, 'svg');
		});

		it('writes svg in table', function () {
			var dd = {
				content: [
					{
						table: {
							body: [
								[{ svg: '<svg width="200" height="100" viewBox="0 0 600 300"></svg>' }]
							]
						}
					}
				],
			};

			var pages = testHelper.renderPages('A6', dd);

			var types = pages[0].items.map(item => item.type);
			assert.ok(types.includes('svg'));
		});

	});

});
