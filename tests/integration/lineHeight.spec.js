'use strict';

var assert = require('assert');

var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: lineHeight', function () {

	var testHelper = new IntegrationTestHelper();

	// Roboto: ascender 0.927734375 em, descender 0.244140625 em, so the font height is 1.171875 em
	var ASCENDER = 0.927734375;
	var FONT_HEIGHT = 1.171875;

	function dd(fontSize, lineHeight, mode, content) {
		var style = { font: 'Roboto', fontSize: fontSize };
		if (lineHeight !== undefined) {
			style.lineHeight = lineHeight;
		}
		if (mode) {
			style.lineHeightMode = mode;
		}
		return { defaultStyle: style, content: content };
	}

	function lines(pages) {
		return pages[0].items.map(node => node.item);
	}

	function baselineOf(line) {
		return line.y + line.getAscenderHeight();
	}

	describe('default mode (fontHeight)', function () {
		it('multiplies the height of the font by lineHeight', function () {
			var pages = testHelper.renderPages('A4', dd(10, 2, undefined, ['a', 'b']));
			var l = lines(pages);

			assert.equal(l[1].y - l[0].y, FONT_HEIGHT * 10 * 2);
			assert.equal(l[0].getAscenderHeight(), ASCENDER * 10);
		});
	});

	describe("lineHeightMode: 'css'", function () {
		it('uses fontSize * lineHeight as height of the line, for any font size', function () {
			[[10, 1], [10, 1.5], [10, 2], [24, 1.25]].forEach(function (c) {
				var l = lines(testHelper.renderPages('A4', dd(c[0], c[1], 'css', ['a', 'b'])));
				assert.ok(Math.abs(l[1].y - l[0].y - c[0] * c[1]) < 1e-9, c.join(' / '));
			});
		});

		it('centers the height of the font in the line box (half-leading)', function () {
			[[10, 1], [10, 1.5], [10, 2]].forEach(function (c) {
				var l = lines(testHelper.renderPages('A4', dd(c[0], c[1], 'css', ['a'])))[0];
				var halfLeading = (c[0] * c[1] - FONT_HEIGHT * c[0]) / 2;
				assert.ok(Math.abs(l.getAscenderHeight() - (ASCENDER * c[0] + halfLeading)) < 1e-9, c.join(' / '));
			});
		});

		it('does not change anything when lineHeight is not defined', function () {
			var fontHeight = lines(testHelper.renderPages('A4', dd(10, undefined, undefined, ['a', 'b'])));
			var css = lines(testHelper.renderPages('A4', dd(10, undefined, 'css', ['a', 'b'])));

			assert.deepEqual(css.map(l => [l.y, l.getHeight(), l.getAscenderHeight()]), fontHeight.map(l => [l.y, l.getHeight(), l.getAscenderHeight()]));
		});

		it('keeps the baselines of inlines with different font sizes aligned', function () {
			var pages = testHelper.renderPages('A4', dd(10, 1.5, 'css', [{ text: ['a ', { text: 'BIG', fontSize: 22 }, ' b ', { text: 'tiny', fontSize: 6 }] }, 'next']));
			var l = lines(pages);

			// the biggest inline defines height and baseline: 22 * 1.5
			assert.ok(Math.abs(l[0].getHeight() - 33) < 1e-9);
			assert.ok(Math.abs(l[1].y - l[0].y - 33) < 1e-9);
		});

		it('applies the lineHeightMode of a node to its children only', function () {
			var pages = testHelper.renderPages('A4', {
				defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 2 },
				content: [{ text: 'a' }, { text: 'b', lineHeightMode: 'css' }, { text: 'c' }]
			});
			var l = lines(pages);

			assert.ok(Math.abs(l[1].getHeight() - 20) < 1e-9);
			assert.ok(Math.abs(l[0].getHeight() - FONT_HEIGHT * 20) < 1e-9);
			assert.ok(Math.abs(l[2].getHeight() - FONT_HEIGHT * 20) < 1e-9);
		});

		it('keeps list markers at the same distance from the baseline', function () {
			[undefined, 1, 1.5, 2].forEach(function (lineHeight) {
				var pages = testHelper.renderPages('A4', dd(12, lineHeight, 'css', [{ ul: ['item'] }]));
				var content = pages[0].items[0].item;
				var bullet = pages[0].items[1].item;

				assert.equal(bullet.type, 'ellipse');
				// the bullet is drawn a third of the font size above the baseline
				assert.ok(Math.abs(baselineOf(content) - bullet.y - 12 / 3) < 1e-9, String(lineHeight));
			});
		});

		it('keeps the numbers of ordered lists on the baseline of their text', function () {
			var pages = testHelper.renderPages('A4', dd(12, 1.5, 'css', [{ ol: ['item'] }]));
			var content = pages[0].items[0].item;
			var number = pages[0].items[1].item;

			assert.ok(Math.abs(baselineOf(content) - baselineOf(number)) < 1e-9);
		});

		it('moves the text of a column by the half-leading', function () {
			var fontHeight = testHelper.renderPages('A4', dd(10, undefined, undefined, [{ columns: [{ text: 'a' }, { text: 'b' }] }]));
			var css = testHelper.renderPages('A4', dd(10, 2, 'css', [{ columns: [{ text: 'a' }, { text: 'b' }] }]));

			var halfLeading = (10 * 2 - FONT_HEIGHT * 10) / 2;
			assert.ok(Math.abs(baselineOf(lines(css)[0]) - (baselineOf(lines(fontHeight)[0]) + halfLeading)) < 1e-9);
		});

		it('keeps list markers on the baseline of their item when the item has its own lineHeight', function () {
			var pages = testHelper.renderPages('A4', {
				defaultStyle: { font: 'Roboto', fontSize: 12 },
				content: [{
					lineHeightMode: 'css',
					lineHeight: 1,
					ul: [
						{ text: 'First item', lineHeight: 2 },
						{ text: 'Second item', lineHeight: 2 }
					]
				}]
			});
			var all_items = pages[0].items.map(node => node.item);
			var bullets = all_items.filter(item => item.type === 'ellipse');
			var text_lines = all_items.filter(item => typeof item.getAscenderHeight === 'function');

			assert.equal(bullets.length, 2);
			assert.equal(text_lines.length, 2);
			bullets.forEach(function (bullet, index) {
				assert.ok(Math.abs(baselineOf(text_lines[index]) - bullet.y - 12 / 3) < 1e-9, 'item ' + index);
			});
		});
	});
});
