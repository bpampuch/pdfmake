'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: character spacing', function () {
	var testHelper = new IntegrationTestHelper();

	[
		{ text: '\uC548\uB155\uD558\uC138\uC694' },
		{ text: '\u4E2D\u6587\u5B57\u7B26' },
		{ text: '\u3072\u3089\u304C\u306A' },
		{ text: 'ABC', wordBreak: 'break-all' },
		{ text: 'A\u{1f600}B', wordBreak: 'break-all' }
	].forEach(function (sample) {
		[-1, 0, 6].forEach(function (spacing) {
			it('spaces every character of ' + sample.text + ' by ' + spacing + 'pt', function () {
				var pages = testHelper.renderPages('A5', {
					content: [{ ...sample, characterSpacing: spacing }]
				});
				assert.equal(pages.length, 1);
				assert.equal(pages[0].items.length, 1);
				var inlines = pages[0].items[0].item.inlines;
				assert.deepEqual(inlines.map(inline => inline.text), Array.from(sample.text));
				var x = 0;
				inlines.forEach(function (inline) {
					assert(Math.abs(inline.x - x) < 1e-10);
					x += testHelper.getWidthOfString(inline.text) + spacing;
				});
				assert(Math.abs(pages[0].items[0].item.getWidth() - x) < 1e-10);
			});
		});
	});

	it('keeps character spacing across styled inline boundaries', function () {
		var pages = testHelper.renderPages('A5', {
			content: [{ text: [{ text: 'ab' }, { text: 'cd', color: 'red' }], characterSpacing: 6 }]
		});
		var inlines = pages[0].items[0].item.inlines;
		assert.equal(inlines.length, 2);
		assert.equal(inlines[1].x, testHelper.getWidthOfString('ab') + 12);
	});

	it('includes character spacing when wrapping break-all text', function () {
		testHelper.renderPages('A5', { content: ['A'] });
		var width = 2 * (testHelper.getWidthOfString('A') + 6) + 0.01;
		var pages = testHelper.renderPages('A5', {
			content: [{ columns: [{ width: width, text: 'AAA', wordBreak: 'break-all', characterSpacing: 6 }] }]
		});
		assert.equal(pages[0].items.length, 2);
		assert.deepEqual(testHelper.getInlineTexts(pages, { page: 0, item: 0 }), ['A', 'A']);
		assert.deepEqual(testHelper.getInlineTexts(pages, { page: 0, item: 1 }), ['A']);
	});
});
