'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');
var Renderer = require('../../js/Renderer').default;

describe('Integration test: canvas paths (#1290)', function () {
	function canvas() {
		return [
			{ type: 'path', d: 'M 10 10 L 210 10', lineColor: 'blue', lineWidth: 3 },
			{ type: 'line', x1: 10, y1: 10, x2: 210, y2: 10, lineColor: 'red', lineWidth: 1 }
		];
	}

	function assertOverlapping(helper, pages) {
		var document = helper.pdfDocument;
		var renderer = new Renderer(document);
		var points = [];
		var original = document.moveTo;
		document.moveTo = function (x, y) {
			var m = this._ctm;
			points.push([m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]);
			return original.call(this, x, y);
		};
		try {
			for (const page of pages) {
				for (const item of page.items) {
					if (item.type === 'vector' && ['blue', 'red'].includes(item.item.lineColor)) {
						var matrix = document._ctm.slice();
						renderer.renderVector(item.item);
						assert.deepStrictEqual(document._ctm, matrix, 'path translation must not affect subsequent elements');
					}
				}
			}
		} finally {
			document.moveTo = original;
		}
		assert(points.length > 0);
		for (let i = 0; i < points.length; i += 2) {
			assert.deepStrictEqual(points[i], points[i + 1]);
		}
	}

	it('should overlap paths and lines with default page margins', function () {
		var helper = new IntegrationTestHelper();
		var pages = helper.renderPages('A4', { content: [{ canvas: canvas() }] });
		assertOverlapping(helper, pages);
	});

	it('should preserve canvas margins and alignment inside an unbreakable table', function () {
		var helper = new IntegrationTestHelper();
		var cell = { canvas: canvas(), alignment: 'center', margin: [10, 20, 0, 0] };
		var pages = helper.renderPages('A4', { content: [{ table: { widths: [250], dontBreakRows: true, body: [[cell]] } }] });
		assertOverlapping(helper, pages);
	});

	it('should reset path offsets when pageBreakBefore repeats layout', function () {
		var helper = new IntegrationTestHelper();
		var pages = helper.renderPages('A4', {
			content: [{ text: 'BEFORE' }, { id: 'drawing', canvas: canvas(), alignment: 'right', margin: [15, 20, 0, 0] }],
			pageBreakBefore: node => node.id === 'drawing'
		});
		assert.equal(pages.length, 2);
		assertOverlapping(helper, pages);
	});

	[
		{ d: 'M 1000 1000', width: 0, height: 0 },
		{ d: 'M 1000 1000 Z', width: 0, height: 0 },
		{ d: 'M 0 0 L 10 10 M 1000 1000', width: 10, height: 10 },
		{ d: 'M 1000 1000 M 20 30 L 10 10', width: 20, height: 30 },
		{ d: 'M 1000 1000 M 100 100 C 0 0 0 0 10 10', width: 100, height: 100 },
		{ d: 'M 10 10 L 210 10', width: 210, height: 10 },
		{ d: 'M 0 0 C 0 100 100 100 100 0', width: 100, height: 75 },
		{ d: 'M 0 0 C 100 0 100 100 0 100', width: 75, height: 100 },
		{ d: 'M 0 0 C 10 20 20 40 30 60', width: 30, height: 60 },
		{ d: 'M 0 50 A 50 50 0 0 0 100 50', width: 100, height: 100 },
		{ d: 'M 10 20 l 20 20 z l 50 60', width: 60, height: 80 }
	].forEach(testCase => {
		it('should reserve canvas space for path ' + JSON.stringify(testCase.d), function () {
			var helper = new IntegrationTestHelper();
			var node = { canvas: [{ type: 'path', d: testCase.d }] };
			var pages = helper.renderPages('A4', { content: [node, { text: 'AFTER' }] });
			assert(Math.abs(node._minWidth - testCase.width) < 1e-8);
			assert(Math.abs(node._minHeight - testCase.height) < 1e-8);
			var text = pages[0].items.find(item => item.type === 'line').item;
			assert(Math.abs(text.y - (40 + testCase.height)) < 1e-8);
		});
	});

	it('should measure path offsets and negative coordinates before alignment', function () {
		var helper = new IntegrationTestHelper();
		var node = { alignment: 'right', canvas: [{ type: 'path', d: 'M -30 -20 L -10 -5', x: 50, y: 30 }] };
		var pages = helper.renderPages('A4', { content: [node, { text: 'AFTER' }] });
		assert.equal(node._minWidth, 40);
		assert.equal(node._minHeight, 25);
		assert.equal(pages[0].items.find(item => item.type === 'line').item.y, 65);
		var path = pages[0].items.find(item => item.type === 'vector').item;
		assert.equal(path.x - 10, 555.28);
	});

	it('should move a path-only canvas to the next page when it does not fit', function () {
		var helper = new IntegrationTestHelper();
		var pages = helper.renderPages('A4', { content: [
			{ canvas: [{ type: 'rect', x: 0, y: 0, w: 10, h: 700 }] },
			{ canvas: [{ type: 'path', d: 'M 0 0 L 20 100' }] },
			{ text: 'AFTER' }
		] });
		assert.equal(pages.length, 2);
		assert(pages[1].items.some(item => item.type === 'vector' && item.item.type === 'path'));
		assert.equal(pages[1].items.find(item => item.type === 'line').item.y, 140);
	});
});
