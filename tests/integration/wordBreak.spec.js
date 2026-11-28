'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: word breaking', function () {
	var testHelper = new IntegrationTestHelper();

	[10, 150].forEach(function (width) {
		it('preserves a supplementary character split across break-all fragments, width=' + width, function () {
			var texts = [
				'A\u{1f600}B',
				['A\uD83D', '\uDE00B'],
				['A\uD83D', '', '\uDE00B']
			];
			var lines = texts.map(function (text) {
				var pages = testHelper.renderPages('A6', {
					content: [{ columns: [{ width: width, text: text, wordBreak: 'break-all' }] }]
				});
				return pages.map(page => page.items.map(({ item }) => ({
					text: item.inlines.map(inline => inline.text).join(''),
					width: item.getWidth(),
					y: item.y
				})));
			});

			assert.deepEqual(lines[1], lines[0]);
			assert.deepEqual(lines[2], lines[0]);
		});
	});

	['\n', '\r', '\r\n'].forEach(function (separator) {
		[false, true].forEach(function (breakAll) {
			it('respects hard breaks with noWrap, separator=' + JSON.stringify(separator) + ', breakAll=' + breakAll, function () {
				var pages = testHelper.renderPages('A6', {
					content: [{ columns: [{
						width: 10,
						text: 'AB CD' + separator + separator + 'EF GH' + separator,
						noWrap: true,
						wordBreak: breakAll ? 'break-all' : 'normal'
					}] }]
				});

				assert.equal(pages.length, 1);
				var lines = pages[0].items.map(({ item }) => item);
				assert.deepEqual(lines.map(line => line.inlines.map(inline => inline.text).join('')), ['AB CD', '', 'EF GH']);
				lines.forEach((line, index) => assert.equal(line.y, testHelper.MARGINS.top + index * testHelper.LINE_HEIGHT));
			});
		});
	});

	it('preserves separate CR and LF breaks across styles without automatically wrapping noWrap text', function () {
		var pages = testHelper.renderPages('A6', {
			content: [{ columns: [{
				width: 10,
				noWrap: true,
				text: [{ text: 'AB ', bold: true }, 'CD\r', '', { text: '\nEF GH', italics: true }]
			}] }]
		});

		assert.equal(pages.length, 1);
		assert.deepEqual(pages[0].items.map(({ item }) => item.inlines.map(inline => inline.text).join('')), ['AB CD', '', 'EF GH']);
		pages[0].items.forEach(({ item }, index) => assert.equal(item.y, testHelper.MARGINS.top + index * testHelper.LINE_HEIGHT));
	});

	[false, true].forEach(function (noWrap) {
		['normal', 'break-all'].forEach(function (wordBreak) {
			it('preserves each CR and LF break in separate fragments, noWrap=' + noWrap + ', wordBreak=' + wordBreak, function () {
				var pages = testHelper.renderPages('A6', {
					content: [{
						text: [{ text: 'A\r', bold: true }, { text: '\r', color: 'red' }, '', { text: '\nB', italics: true }],
						noWrap: noWrap,
						wordBreak: wordBreak
					}]
				});
				var lines = pages[0].items.map(({ item }) => item);

				assert.equal(pages.length, 1);
				assert.deepEqual(lines.map(line => line.inlines.map(inline => inline.text).join('')), ['A', '', '', 'B']);
				lines.forEach((line, index) => assert.equal(line.y, testHelper.MARGINS.top + index * testHelper.LINE_HEIGHT));
				assert.equal(lines[0].inlines[0].font.name, 'Roboto-Medium');
				assert.equal(lines[1].inlines.find(inline => inline.lineEnd).color, 'red');
				assert.equal(lines[2].inlines.find(inline => inline.lineEnd).font.name, 'Roboto-Italic');
				assert.equal(lines[3].inlines.find(inline => inline.text === 'B').font.name, 'Roboto-Italic');
			});
		});
	});

	it('uses each fragment font size for separate CR and LF breaks', function () {
		var pages = testHelper.renderPages('A6', {
			content: [{ text: [
				{ text: 'A\r', fontSize: 20 },
				{ text: '\n', fontSize: 40 },
				{ text: 'B', fontSize: 12 }
			] }]
		});
		var lines = pages[0].items.map(({ item }) => item);

		assert.equal(pages.length, 1);
		assert.deepEqual(lines.map(line => line.inlines.map(inline => inline.text).join('')), ['A', '', 'B']);
		assert.deepEqual(lines.map(line => line.getHeight()), [23.4375, 46.875, 14.0625]);
		assert.deepEqual(lines.map(line => line.y), [40, 63.4375, 110.3125]);
		assert.deepEqual(lines.map(line => line.inlines[0].fontSize), [20, 40, 12]);
	});

	it('preserves a required Unicode break at the end of a styled fragment', function () {
		var texts = ['AB\u2028CD', [{ text: 'AB\u2028' }, '', { text: 'CD' }]];
		var lines = texts.map(function (text) {
			var pages = testHelper.renderPages('A6', {
				content: [{ columns: [{ width: 150, text: text }] }]
			});
			return pages[0].items.map(({ item }) => ({
				text: item.inlines.map(inline => inline.text).join(''),
				y: item.y
			}));
		});

		assert.deepEqual(lines[1], lines[0]);
		assert.equal(lines[1].length, 2);
	});

	it('preserves explicit empty lines between empty fragments', function () {
		var pages = testHelper.renderPages('A6', {
			content: [{ columns: [{ width: 20, text: ['AB', '', '\n', '', '\n', '', 'CD'] }] }]
		});

		assert.deepEqual(pages[0].items.map(({ item }) => item.inlines.map(inline => inline.text).join('')), ['AB', '', 'CD']);
	});

	it('moves a whole word to the next line across styles and empty fragments', function () {
		var pages = testHelper.renderPages('A6', {
			content: [{ columns: [{ width: 37, text: ['One wo', '', { text: '' }, { text: 'rd', bold: true }, ' end'] }] }]
		});
		var lines = pages[0].items.map(({ item }) => item);

		assert.deepEqual(lines.map(line => line.inlines.map(inline => inline.text).join('')), ['One ', 'word ', 'end']);
		assert.equal(lines[1].inlines.find(inline => inline.text.startsWith('rd')).font.name, 'Roboto-Medium');
	});

	[1, 2].forEach(function (breakCount) {
		it('lays out CRLF like LF with break-all for ' + breakCount + ' hard breaks', function () {
			var lines = ['\n', '\r', '\r\n'].map(function (newline) {
				var pages = testHelper.renderPages('A5', {
					content: [{ text: 'A' + newline.repeat(breakCount) + 'B', wordBreak: 'break-all' }]
				});
				assert.equal(pages.length, 1);
				return pages[0].items.filter(item => item.item.inlines.some(inline => inline.text === 'B'));
			});
			lines.forEach(function (items) {
				assert.equal(items.length, 1);
				assert.equal(items[0].item.y, testHelper.MARGINS.top + breakCount * testHelper.LINE_HEIGHT);
			});
		});
	});

	it('does not add a page for CRLF with break-all near the bottom margin', function () {
		['\n', '\r\n'].forEach(function (newline) {
			var pages = testHelper.renderPages('A6', {
				content: [
					Array(22).fill('PRE').join('\n'),
					{ text: 'A' + newline + 'B', wordBreak: 'break-all' }
				]
			});
			assert.equal(pages.length, 1);
			var lastLine = pages[0].items[pages[0].items.length - 1].item;
			assert.deepEqual(lastLine.inlines.map(inline => inline.text), ['B']);
			assert.equal(lastLine.y, testHelper.MARGINS.top + 23 * testHelper.LINE_HEIGHT);
		});
	});

	it('preserves supplementary characters in break-all inlines without wrapping', function () {
		var pages = testHelper.renderPages('A5', {
			content: [{ text: 'A\u{1f600}B', wordBreak: 'break-all' }]
		});

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 1);
		assert.deepEqual(testHelper.getInlineTexts(pages, { page: 0, item: 0 }), ['A', '\u{1f600}', 'B']);
	});

	it('splits a long word only between complete supplementary characters', function () {
		var character = '\u{10400}';
		testHelper.renderPages('A5', { content: [character] });
		var width = testHelper.getWidthOfString(character.repeat(2)) + 0.01;
		var pages = testHelper.renderPages('A5', {
			content: [{ columns: [{ width: width, text: character.repeat(4) }] }]
		});

		assert.equal(pages.length, 1);
		assert.equal(pages[0].items.length, 2);
		pages[0].items.forEach(function (item) {
			assert.deepEqual(item.item.inlines.map(inline => inline.text), [character.repeat(2)]);
		});
	});

	['normal', 'break-all'].forEach(function (wordBreak) {
		it('preserves supplementary characters wider than a column with ' + wordBreak, function () {
			var pages = testHelper.renderPages('A5', {
				content: [{ columns: [{ width: 1, text: '\u{1f600}\u{1f600}', wordBreak: wordBreak }] }]
			});

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 2);
			pages[0].items.forEach(function (item) {
				assert.deepEqual(item.item.inlines.map(inline => inline.text), ['\u{1f600}']);
			});
		});
	});
});
