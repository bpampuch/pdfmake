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
