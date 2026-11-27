'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: table border colors', function () {
	[false, true].forEach(function (dontBreakRows) {
		[1, 2].forEach(function (colSpan) {
			[1, 35].forEach(function (lineCount) {
				[
					{ previousBorder: true, currentBorder: true, expected: 'green' },
					{ previousBorder: false, currentBorder: true, expected: 'red' },
					{ previousBorder: true, currentBorder: false, expected: 'green' }
				].forEach(function (variant) {
					it('preserves the previous rowspan border color priority, colSpan=' + colSpan + ', lines=' + lineCount + ', dontBreakRows=' + dontBreakRows + ', borders=' + variant.previousBorder + '/' + variant.currentBorder, function () {
						var expected = Array.from({ length: lineCount }, (_, index) => 'S' + index);
						var rightCell = text => ({ text, border: [variant.currentBorder, true, true, true], borderColor: ['red', 'black', 'blue', 'black'] });
						var pages = new IntegrationTestHelper().renderPages('A6', { content: [{ table: {
							dontBreakRows,
							widths: Array(2 + colSpan).fill(30),
							body: [
								['A', { text: expected.join('\n'), rowSpan: 2, colSpan, border: [true, true, variant.previousBorder, true], borderColor: ['black', 'black', 'green', 'black'] }, ...(colSpan === 2 ? [{}] : []), rightCell('B')],
								['C', {}, ...(colSpan === 2 ? [{}] : []), rightCell('D')]
							]
						} }] });
						assert.equal(pages.length, lineCount === 1 ? 1 : 2);
						var texts = pages.flatMap(page => page.items.filter(entry => entry.type === 'line')
							.map(entry => entry.item.inlines.map(inline => inline.text).join('')));
						assert.deepStrictEqual(texts.filter(text => /^S\d+$/.test(text)), expected);
						var borders = pages.flatMap(page => page.items.filter(entry => entry.type === 'vector' && entry.item.type === 'line' && entry.item.x1 === entry.item.x2)
							.map(entry => entry.item));
						var sharedX = [...new Set(borders.map(border => border.x1))].sort((a, b) => a - b)[2];
						var sharedBorders = borders.filter(border => border.x1 === sharedX);
						assert.ok(sharedBorders.length >= 2, 'checks the initial and continuing shared borders');
						sharedBorders.forEach(border => assert.equal(border.lineColor, variant.expected));
					});
				});
			});
		});
	});

	[false, true].forEach(function (dontBreakRows) {
		[1, 2].forEach(function (rowSpan) {
			[0, 1, 2].forEach(function (column) {
				it('ignores colors of disabled borders (#1807), rowSpan=' + rowSpan + ', column=' + column + ', dontBreakRows=' + dontBreakRows, function () {
					var body = [
						['Column 1', 'Column 2', 'Column 3'],
						['One value goes here', 'Another one here', 'OK?']
					];
					body[1][column] = {
						text: body[1][column], rowSpan,
						border: [false, false, false, false],
						borderColor: ['#00ffff', '#00ffff', '#00ffff', '#00ffff']
					};
					if (rowSpan === 2) {
						body.push(['after 1', 'after 2', 'after 3']);
						body[2][column] = {};
					}
					var pages = new IntegrationTestHelper().renderPages('A6', { content: [{ table: { dontBreakRows, body } }] });
					var borders = pages.flatMap(page => page.items.filter(entry => entry.type === 'vector' && entry.item.type === 'line'));
					assert.ok(borders.length > 0);
					borders.forEach(border => assert.equal(border.item.lineColor, 'black'));
				});
			});
		});
	});

	[
		{ name: 'prefers the previous cell right border color', leftBorder: true, rightBorder: true, expected: 'green' },
		{ name: 'ignores the previous cell disabled right border', leftBorder: false, rightBorder: true, expected: 'red' },
		{ name: 'ignores the next cell disabled left border', leftBorder: true, rightBorder: false, expected: 'black', leftColor: null }
	].forEach(function (variant) {
		it(variant.name, function () {
			var pages = new IntegrationTestHelper().renderPages('A6', { content: [{ table: {
				widths: ['*', '*'],
				body: [[
					{ text: 'left', border: [true, true, variant.leftBorder, true], borderColor: ['black', 'black', variant.leftColor === null ? null : 'green', 'black'] },
					{ text: 'right', border: [variant.rightBorder, true, true, true], borderColor: ['red', 'black', 'blue', 'black'] }
				]]
			} }] });
			var colors = pages[0].items.filter(entry => entry.type === 'vector' && entry.item.type === 'line' && entry.item.x1 === entry.item.x2)
				.map(entry => entry.item.lineColor);
			assert.deepStrictEqual(colors, ['black', variant.expected, 'blue']);
		});
	});

	[false, true].forEach(function (dontBreakRows) {
		[1, 2].forEach(function (colSpan) {
			[1, 35].forEach(function (lineCount) {
				[
					{ name: 'different colors', left: true, right: true, color: 'black', expected: 'black' },
					{ name: 'disabled right border', left: true, right: false, color: 'red', expected: 'red' },
					{ name: 'disabled left border', left: false, right: true, color: 'red', expected: 'black' },
					{ name: 'colored left border', left: true, right: true, color: 'red', expected: 'red' },
					{ name: 'previous cell color priority', left: true, right: true, color: 'red', previousColor: 'green', expected: 'green' }
				].forEach(function (variant) {
					it('preserves rowspan left border: ' + variant.name + ', colSpan=' + colSpan + ', lines=' + lineCount + ', dontBreakRows=' + dontBreakRows, function () {
						var expected = Array.from({ length: lineCount }, (_, index) => 'S' + index);
						var previousCell = text => ({ text, borderColor: ['black', 'black', variant.previousColor, 'black'] });
						var pages = new IntegrationTestHelper().renderPages('A6', { content: [{ table: {
							dontBreakRows,
							widths: Array(2 + colSpan).fill(40),
							body: [
								['A', previousCell('B'), {
									text: expected.join('\n'), rowSpan: 2, colSpan,
									border: [variant.left, true, variant.right, true],
									borderColor: [variant.color, 'black', 'blue', 'black']
								}, ...(colSpan === 2 ? [{}] : [])],
								['C', previousCell('D'), {}, ...(colSpan === 2 ? [{}] : [])]
							]
						} }] });
						assert.equal(pages.length, lineCount === 1 ? 1 : 2);
						var texts = pages.flatMap(page => page.items.filter(entry => entry.type === 'line')
							.map(entry => entry.item.inlines.map(inline => inline.text).join('')));
						assert.deepStrictEqual(texts.filter(text => /^S\d+$/.test(text)), expected);
						var borders = pages.flatMap(page => page.items.filter(entry => entry.type === 'vector' && entry.item.type === 'line' && entry.item.x1 === entry.item.x2)
							.map(entry => entry.item));
						var leftX = [...new Set(borders.map(border => border.x1))].sort((a, b) => a - b)[2];
						var leftBorders = borders.filter(border => border.x1 === leftX);
						assert.ok(leftBorders.length >= 2, 'checks the initial and continuing rowspan borders');
						leftBorders.forEach(border => assert.equal(border.lineColor, variant.expected));
					});
				});
			});
		});

		[1, 60].forEach(function (lineCount) {
			it('uses the next cell border color independently of row count, lines=' + lineCount + ', dontBreakRows=' + dontBreakRows, function () {
				var expected = Array.from({ length: lineCount }, (_, index) => 'L' + index);
				[false, true].forEach(function (extraRow) {
					var pages = new IntegrationTestHelper().renderPages('A6', { content: [{ table: {
						dontBreakRows,
						widths: ['*', '*'],
						body: [
							[{ text: expected.join('\n') }, { text: 'right', borderColor: ['red', 'black', 'blue', 'black'] }],
							...(extraRow ? [['after', 'after2']] : [])
						]
					} }] });
					assert.equal(pages.length, lineCount === 1 ? 1 : 3);
					var texts = pages.flatMap(page => page.items.filter(entry => entry.type === 'line')
						.map(entry => entry.item.inlines.map(inline => inline.text).join('')));
					assert.deepStrictEqual(texts.filter(text => /^L\d+$/.test(text)), expected);
					pages.forEach(function (page, index) {
						var colors = page.items.filter(entry => entry.type === 'vector' && entry.item.type === 'line' && entry.item.x1 === entry.item.x2)
							.map(entry => entry.item.lineColor);
						var expectedColors = ['black', 'red', 'blue'];
						if (extraRow && index === pages.length - 1) {
							expectedColors.push('black', 'black', 'black');
						}
						assert.deepStrictEqual(colors, expectedColors);
					});
				});
			});
		});
	});
});
