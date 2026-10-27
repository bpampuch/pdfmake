'use strict';

var assert = require('assert');
var sizes = require('../../js/standardPageSizes').default;
var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: alignment', function () {

	var testHelper = new integrationTestHelper();

	it('renders text right aligned', function () {

		var dd = {
			content: [
				{
					text: 'Left aligned before',
					alignment: 'left'
				},
				{
					text: 'Right aligned',
					alignment: 'right'
				},
				{
					text: 'Left aligned after',
					alignment: 'left'
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var itemLeftBefore = pages[0].items[0].item;
		assert.equal(itemLeftBefore.x, testHelper.MARGINS.left);
		assert.equal(itemLeftBefore.y, testHelper.MARGINS.top);

		var itemRight = pages[0].items[1].item;
		assert.equal(itemRight.x, sizes.A6[0] - testHelper.MARGINS.right - testHelper.getWidthOfString('Right aligned'));
		assert.equal(itemRight.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);

		var itemLeftAfter = pages[0].items[2].item;
		assert.equal(itemLeftAfter.x, testHelper.MARGINS.left);
		assert.equal(itemLeftAfter.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);
	});

	it('renders text center aligned', function () {

		var dd = {
			content: [
				{
					text: 'Left aligned before',
					alignment: 'left'
				},
				{
					text: 'Right aligned',
					alignment: 'center'
				},
				{
					text: 'Left aligned after',
					alignment: 'left'
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var itemLeftBefore = pages[0].items[0].item;
		assert.equal(itemLeftBefore.x, testHelper.MARGINS.left);
		assert.equal(itemLeftBefore.y, testHelper.MARGINS.top);

		var itemCenter = pages[0].items[1].item;
		assert.equal(itemCenter.x, sizes.A6[0] / 2 - testHelper.getWidthOfString('Right aligned') / 2);
		assert.equal(itemCenter.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);

		var itemLeftAfter = pages[0].items[2].item;
		assert.equal(itemLeftAfter.x, testHelper.MARGINS.left);
		assert.equal(itemLeftAfter.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);
	});

	it('renders text justify aligned', function () {

		var dd = {
			content: [
				{
					text: 'Left aligned before',
					alignment: 'left'
				},
				{
					text: 'I\'m not sure yet if this is the_desired_behavior. I find it a better.',
					alignment: 'justify'
				},
				{
					text: 'Left aligned after',
					alignment: 'left'
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var itemLeftBefore = pages[0].items[0].item;
		assert.equal(itemLeftBefore.x, testHelper.MARGINS.left);
		assert.equal(itemLeftBefore.y, testHelper.MARGINS.top);

		var itemJustify1 = pages[0].items[1].item;
		assert.equal(itemJustify1.x, testHelper.MARGINS.left);
		assert.equal(itemJustify1.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT);

		var availablePageWidth = sizes.A6[0] - testHelper.MARGINS.left - testHelper.MARGINS.right;
		var endOfLastItem = itemJustify1.inlines[itemJustify1.inlines.length - 1].x + testHelper.getWidthOfString('is');
		assert.equal(endOfLastItem, availablePageWidth);

		var itemJustify2 = pages[0].items[2].item;
		assert.equal(itemJustify2.x, testHelper.MARGINS.left);
		assert.equal(itemJustify2.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 2);
		assert.equal(itemJustify2.inlineWidths, testHelper.getWidthOfString('the_desired_behavior. I find it a better.'));

		var itemLeftAfter = pages[0].items[3].item;
		assert.equal(itemLeftAfter.x, testHelper.MARGINS.left);
		assert.equal(itemLeftAfter.y, testHelper.MARGINS.top + testHelper.LINE_HEIGHT * 3);
	});

	[
		{ name: 'a comma in a separate fragment', prefix: [{ text: 'Hello' }, { text: ', ' }] },
		{ name: 'a comma after a bold fragment', prefix: [{ text: 'Hello', bold: true }, { text: ', ' }] },
		{ name: 'a word split by a style change', prefix: [{ text: 'Hel', bold: true }, { text: 'lo ' }] },
		{ name: 'a non-breaking space across styles', prefix: [{ text: 'Hello\u00a0', bold: true }, { text: 'world ' }] },
		{ name: 'a word joiner across styles', prefix: [{ text: 'Hello\u2060', bold: true }, { text: 'world ' }] },
		{ name: 'an empty fragment', prefix: [{ text: 'Hello', bold: true }, { text: '' }] }
	].forEach(function (example) {
		it('justifies text without separating ' + example.name, function () {
			var pages = testHelper.renderPages('A6', {
				content: [{
					text: example.prefix.concat([{ text: 'world next words repeat repeat repeat' }]),
					alignment: 'justify'
				}]
			});
			var lines = pages[0].items.map(item => item.item);
			assert.equal(lines.length, 2);

			var firstLine = lines[0];
			assert.equal(firstLine.inlines[0].text, example.prefix[0].text);
			assert.equal(firstLine.inlines[1].text, example.prefix[1].text);
			assert(Math.abs(firstLine.inlines[1].x - firstLine.inlines[0].x - firstLine.inlines[0].width) < 1e-8);

			var lastInline = firstLine.inlines[firstLine.inlines.length - 1];
			var availableWidth = sizes.A6[0] - testHelper.MARGINS.left - testHelper.MARGINS.right;
			assert(Math.abs(lastInline.x + lastInline.width - lastInline.trailingCut - availableWidth) < 1e-8);
			assert(firstLine.inlines[2].justifyShift > 0);

			assert.equal(lines[1].inlines[0].x, 0);
			assert.equal(lines[1].inlines[0].justifyShift, undefined);
		});
	});

	[
		{ name: 'explicit newlines', text: [{ text: 'Hel', bold: true }, { text: 'lo, world\nnext words\n' }] },
		{ name: 'a single split word', text: [{ text: 'Hel', bold: true }, { text: 'lo' }] },
		{ name: 'a word wider than the page', text: [{ text: 'a'.repeat(150), bold: true }, { text: 'b'.repeat(150) }] },
		{ name: 'noWrap fragments', text: [{ text: 'Hello', bold: true }, { text: ', world', noWrap: true }, { text: ' next words '.repeat(10) }] },
		{ name: 'break-all fragments', text: [{ text: 'Hello', bold: true }, { text: 'world'.repeat(30), wordBreak: 'break-all' }] },
		{ name: 'Chinese text', text: [{ text: '\u4e2d\u6587'.repeat(30), bold: true }, { text: '\u6d4b\u8bd5'.repeat(30) }] },
		{ name: 'preserved whitespace', text: [{ text: '  Hel', bold: true }, { text: 'lo   world next words '.repeat(10) }], preserveLeadingSpaces: true, preserveTrailingSpaces: true }
	].forEach(function (example) {
		it('preserves wrapping and finite positions with ' + example.name, function () {
			function render(alignment) {
				return testHelper.renderPages('A6', { content: [Object.assign({}, example, { alignment: alignment })] });
			}
			var left = render('left');
			var justified = render('justify');
			assert.equal(justified.length, left.length);
			justified.forEach(function (page, pageIndex) {
				var lines = page.items.filter(item => item.type === 'line').map(item => item.item);
				var leftLines = left[pageIndex].items.filter(item => item.type === 'line').map(item => item.item);
				assert.equal(lines.length, leftLines.length);
				lines.forEach(function (line, lineIndex) {
					var leftLine = leftLines[lineIndex];
					assert.equal(line.x, leftLine.x);
					assert.equal(line.y, leftLine.y);
					assert.deepEqual(line.inlines.map(inline => inline.text), leftLine.inlines.map(inline => inline.text));
					line.inlines.forEach(function (inline, index) {
						assert(Number.isFinite(inline.x));
						if (line.lastLineInParagraph || line.newLineForced) {
							assert.equal(inline.x, leftLine.inlines[index].x);
							assert.equal(inline.justifyShift, undefined);
						} else if (index && line.inlines[index - 1].noNewLine) {
							var previous = line.inlines[index - 1];
							assert(Math.abs(inline.x - previous.x - previous.width) < 1e-8);
						}
					});
				});
			});
		});
	});

	['plain', 'column', 'table', 'unbreakable', 'pageBreakBefore'].forEach(function (container) {
		it('preserves wrapping and page positions for justified fragments in a ' + container, function () {
			function render(alignment) {
				var paragraph = {
					text: Array.from({ length: 80 }, () => [
						{ text: 'Hel', bold: true }, { text: 'lo' }, { text: ', ' }, { text: 'world next words ' }
					]).flat(),
					alignment: alignment,
					id: 'paragraph'
				};
				var node = paragraph;
				if (container === 'column') {
					node = { columns: [{ width: 120, stack: [paragraph] }, { text: 'Second column' }] };
				} else if (container === 'table') {
					node = { table: { widths: [120], body: [[paragraph]] } };
				} else if (container === 'unbreakable') {
					paragraph.text = paragraph.text.slice(0, 16);
					node = { unbreakable: true, stack: [paragraph] };
				}
				return testHelper.renderPages('A6', {
					content: [{ text: 'Before' }, node],
					pageBreakBefore: container === 'pageBreakBefore' ? node => node.id === 'paragraph' : undefined
				});
			}
			var left = render('left');
			var justified = render('justify');
			assert.equal(justified.length, left.length);
			justified.forEach(function (page, pageIndex) {
				var lines = page.items.filter(item => item.type === 'line').map(item => item.item);
				var leftLines = left[pageIndex].items.filter(item => item.type === 'line').map(item => item.item);
				assert.equal(lines.length, leftLines.length);
				lines.forEach(function (line, lineIndex) {
					var leftLine = leftLines[lineIndex];
					assert.equal(line.x, leftLine.x);
					assert.equal(line.y, leftLine.y);
					assert.deepEqual(line.inlines.map(inline => inline.text), leftLine.inlines.map(inline => inline.text));
					line.inlines.forEach(function (inline, index) {
						assert(Number.isFinite(inline.x));
						if (index && line.inlines[index - 1].noNewLine) {
							var previous = line.inlines[index - 1];
							assert(Math.abs(inline.x - previous.x - previous.width) < 1e-8);
						}
					});
					if (line.inlines[0].alignment === 'justify' && !line.lastLineInParagraph && !line.newLineForced) {
						var last = line.inlines[line.inlines.length - 1];
						assert(Math.abs(last.x + last.width - last.trailingCut - line.maxWidth) < 1e-8);
					}
				});
			});
		});
	});

});
