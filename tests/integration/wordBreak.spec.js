'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: word breaking', function () {
	var testHelper = new IntegrationTestHelper();

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
