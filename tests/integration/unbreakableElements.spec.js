'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');
var fixtures = require('./fixtures/unbreakable');

function snapshot(pages) {
	var result = pages.map(page => ({
		size: page.pageSize,
		items: page.items.map(entry => {
			var item = entry.item || {};
			var result = { type: entry.type };
			var keys = entry.type === 'line' ? ['x', 'y', 'inlines'] : [
				'type', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'w', 'h', 'r1', 'r2', 'points',
				'color', 'lineColor', 'lineWidth', 'width', 'height', '_width', '_height', 'attachment', 'svg'
			];
			keys.forEach(key => {
				if ((entry.type === 'beginVerticalAlignment' || entry.type === 'endVerticalAlignment') && (key === 'x' || key === 'y')) {
					return;
				}
				if (item[key] !== undefined) {
					result[key] = key === 'inlines' ? item.inlines.map(inline => {
						var data = {};
						['text', 'x', 'width', 'fontSize', 'color', 'background', 'decoration', 'link', 'linkToDestination', 'sup', 'sub'].forEach(key => {
							if (inline[key] !== undefined) {
								data[key] = inline[key];
							}
						});
						return data;
					}) : key === 'svg' ? item[key].replace(/>\s+</g, '><') : item[key];
				}
			});
			return result;
		})
	}));
	// Compare geometry independently of the order in which table borders are drawn.
	result.forEach(page => {
		page.vectors = page.items.filter(item => item.type === 'rect' || item.type === 'ellipse' || item.type === 'polyline' || item.x1 !== undefined);
		page.items = page.items.filter(item => !page.vectors.includes(item));
		page.vectors.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
	});
	return JSON.parse(JSON.stringify(result, (key, value) => {
		if (typeof value === 'number') {
			assert.ok(Number.isFinite(value), 'Layout values must be finite: ' + key);
			return Math.round(value * 1000000) / 1000000;
		}
		return value;
	}));
}

describe('Integration test: elements inside unbreakable blocks', function () {
	Object.keys(fixtures.modes).forEach(function (mode) {
		fixtures.modes[mode].forEach(function (type) {
			it('preserves ' + type + ' in ' + mode + ' layout', function () {
				var actualHelper = new IntegrationTestHelper();
				var expectedHelper = new IntegrationTestHelper();
				var actualDocument = fixtures.document(type, mode, false);
				var expectedDocument = fixtures.document(type, mode, true);
				var actual = actualHelper.renderPages(actualDocument.pageSize, actualDocument);
				var expected = expectedHelper.renderPages(expectedDocument.pageSize, expectedDocument);

				assert.deepStrictEqual(snapshot(actual), snapshot(expected));
				if (mode === 'watermark') {
					actual.forEach((page, index) => {
						assert.ok(page.watermark);
						assert.equal(page.watermark.text, 'DRAFT');
						assert.equal(page.watermark.fontSize, 22);
						assert.equal(page.watermark.opacity, 0.08);
						assert.equal(page.watermark.angle, expected[index].watermark.angle);
					});
				}
				var filler = actual.flatMap(page => page.items.filter(entry => entry.type === 'line').map(entry => entry.item.inlines.map(inline => inline.text).join(''))).filter(text => /^filler-\d+$/.test(text));
				assert.deepStrictEqual(filler, mode === 'short' || mode === 'short-table' ? [] : Array.from({ length: 60 }, (_, index) => 'filler-' + index));
			});
		});
	});
});
