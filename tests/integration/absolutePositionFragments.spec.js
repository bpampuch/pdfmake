'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

function createNode(type) {
	switch (type) {
		case 'text':
			return { text: 'ABSOLUTE' };
		case 'canvas':
			return { canvas: [{ type: 'rect', x: 3, y: 4, w: 20, h: 15, color: 'red' }] };
		case 'image':
			return { image: 'examples/images/sampleImage.jpg', width: 20 };
		case 'cover':
			return { image: 'examples/images/sampleImage.jpg', cover: { width: 20, height: 15 } };
		case 'svg':
			return { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="15"><rect width="20" height="15"/></svg>' };
		case 'qr':
			return { qr: 'absolute', fit: 20 };
		case 'attachment':
			return { attachment: { src: Buffer.from('Hello'), name: 'hello.txt' }, width: 20, height: 15 };
		case 'table':
			return { table: { widths: [30], body: [['ABSOLUTE']] } };
	}
}

function snapshot(pages) {
	return pages.flatMap(page => page.items.filter(entry => entry.type !== 'line' ||
		!/^(before|flow-)/.test(entry.item.inlines.map(inline => inline.text).join(''))).map(entry => {
		var result = { type: entry.type };
		['x', 'y', 'x1', 'y1', 'x2', 'y2', 'w', 'h', 'width', 'height', 'points'].forEach(key => {
			if (entry.item[key] !== undefined) {
				result[key] = entry.item[key];
			}
		});
		if (entry.type === 'line') {
			result.text = entry.item.inlines.map(inline => inline.text).join('');
		}
		return result;
	}));
}

describe('Integration test: absolute text dimensions in fragments', function () {
	function textLines(pages) {
		return pages.flatMap(page => page.items.filter(entry => entry.type === 'line' &&
			entry.item.inlines[0].text.startsWith('word')).map(entry => ({
				x: entry.item.x,
				y: entry.item.y,
				width: entry.item.maxWidth,
				text: entry.item.inlines.map(inline => inline.text).join('')
			})));
	}

	['block', 'row', 'nested table', 'table header', 'column'].forEach(function (container) {
		[0, 70].forEach(function (x) {
			it('uses page dimensions for absolute text in a ' + container + ', x=' + x, function () {
				function render(wrapped) {
					var node = { absolutePosition: { x: x, y: 90 }, text: 'word '.repeat(15) };
					var content = node;
					if (wrapped) {
						if (container === 'block') {
							content = { unbreakable: true, margin: [10, 5, 20, 0], stack: [node, 'flow'] };
						} else if (container === 'column') {
							content = { columns: [{ width: 80, unbreakable: true, stack: [node, 'flow'] }, 'other'] };
						} else {
							var cell = container === 'nested table'
								? { table: { widths: [50], dontBreakRows: true, body: [[node]] } }
								: node;
							content = { table: { widths: [100], dontBreakRows: true, body: [[{ stack: [cell, 'flow'] }]] } };
							if (container === 'table header') {
								content.table.headerRows = 1;
								content.table.body.push(['data']);
							}
						}
					}
					var helper = new IntegrationTestHelper();
					helper.MARGINS.right = 25;
					return helper.renderPages('A6', { content: [content, 'after'] });
				}
				var expected = textLines(render(false));
				assert.ok(expected.length > 1);
				assert.deepStrictEqual(textLines(render(true)), expected);
			});
		});
	});

	it('keeps absolute text near the page bottom inside an unbreakable block', function () {
		function render(unbreakable) {
			return new IntegrationTestHelper().renderPages('A6', {
				content: [{ unbreakable: unbreakable, stack: [
					{ text: 'word', absolutePosition: { x: 70, y: 350 } }, 'flow'
				] }]
			});
		}
		var expected = textLines(render(false));
		assert.equal(expected.length, 1);
		assert.equal(expected[0].y, 350);
		assert.deepStrictEqual(textLines(render(true)), expected);
	});

	['header', 'footer', 'background'].forEach(function (location) {
		[0, 30].forEach(function (x) {
			it('preserves the full width of absolute text in the ' + location + ', x=' + x, function () {
				var pages = new IntegrationTestHelper().renderPages('A6', {
					content: ['body'],
					[location]: () => ({ text: 'word '.repeat(12), absolutePosition: { x: x, y: 0 } })
				});
				var lines = textLines(pages);
				assert.ok(lines.length > 0);
				assert.equal(lines.map(line => line.text).join(''), 'word '.repeat(12));
				lines.forEach(line => {
					assert.equal(line.x, x);
					assert.equal(line.width, pages[0].pageSize.width - x);
				});
			});
		});
	});

	[350, 380, 390, 400].forEach(function (y) {
		it('preserves absolute background text at y=' + y, function () {
			var pages = new IntegrationTestHelper().renderPages('A6', {
				content: ['body'],
				background: { text: 'word', absolutePosition: { x: 10, y: y } }
			});
			var lines = textLines(pages);
			assert.equal(pages.length, 1);
			assert.equal(lines.length, 1);
			assert.equal(lines[0].x, 10);
			assert.equal(lines[0].y, y);
		});
	});
});

describe('Integration test: absolute coordinates when inserting fragments', function () {
	['text', 'canvas', 'image', 'cover', 'svg', 'qr', 'attachment', 'table'].forEach(function (type) {
		[false, true].forEach(function (nested) {
			[false, true].forEach(function (nextPage) {
				it('preserves ' + type + ' coordinates, nested=' + nested + ', next page=' + nextPage, function () {
					function absoluteNode() {
						return { ...createNode(type), absolutePosition: { x: 70, y: 90 } };
					}
					var reference = absoluteNode();
					var expected = new IntegrationTestHelper().renderPages('A6', { content: [reference] });
					var absolute = absoluteNode();
					var block = {
						unbreakable: true,
						stack: [
							{ text: 'flow-before' },
							nested ? { unbreakable: true, margin: [10, 5, 0, 0], stack: [absolute] } : absolute,
							{ text: 'flow-after\nflow-end' }
						]
					};
					var pages = new IntegrationTestHelper().renderPages('A6', {
						content: [{ text: Array(nextPage ? 22 : 1).fill('before').join('\n') }, block]
					});
					var pageIndex = nextPage ? 1 : 0;
					assert.equal(pages.length, pageIndex + 1);
					assert.deepStrictEqual(snapshot([pages[pageIndex]]), snapshot(expected));
					assert.deepStrictEqual(absolute.positions.map(position => [position.left, position.top]),
						reference.positions.map(position => [position.left, position.top]));
					absolute.positions.forEach(position => assert.equal(position.pageNumber, pageIndex + 1));
					var flow = pages[pageIndex].items.filter(entry => entry.type === 'line' &&
						entry.item.inlines[0].text.startsWith('flow-'));
					assert.equal(flow.length, 3);
					flow.forEach(entry => assert.equal(entry.item.x, 40));
					assert.equal(flow[0].item.y, nextPage ? 40 : 54.0625);
				});
			});
		});
	});

	[false, true].forEach(function (outerUnbreakable) {
		it('positions an unbreakable child relative to its absolute parent, outer block=' + outerUnbreakable, function () {
			var child = { unbreakable: true, text: 'ABSOLUTE' };
			var absolute = { absolutePosition: { x: 70, y: 90 }, stack: [child] };
			var pages = new IntegrationTestHelper().renderPages('A6', {
				content: outerUnbreakable ? [{ unbreakable: true, stack: [absolute] }] : [absolute]
			});
			var line = pages[0].items.find(entry => entry.type === 'line').item;
			assert.equal(line.x, 70);
			assert.equal(line.y, 90);
			assert.equal(child.positions[0].left, 70);
			assert.equal(child.positions[0].top, 90);
		});
	});

	['image', 'svg', 'attachment', 'canvas'].forEach(function (type) {
		it('reuses ' + type + ' under an absolute parent and then in a flowing footer', function () {
			var shared = createNode(type);
			var pages = new IntegrationTestHelper().renderPages('A6', {
				content: [{ text: Array(30).fill('BODY').join('\n') }],
				footer: page => page === 1
					? { absolutePosition: { x: 0, y: 0 }, stack: [shared] }
					: { stack: [shared] }
			});
			var entryType = type === 'canvas' ? 'vector' : type;
			var first = pages[0].items.find(entry => entry.type === entryType).item;
			var second = pages[1].items.find(entry => entry.type === entryType).item;
			assert.equal(pages.length, 2);
			assert.equal(first.y, type === 'canvas' ? 4 : 0);
			assert.equal(second.y, type === 'canvas' ? 383.53 : 379.53);
		});
	});
});
