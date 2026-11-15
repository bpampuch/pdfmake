'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');
var Renderer = require('../../js/Renderer').default;

describe('Integration test: text maxHeight', function () {
	var testHelper = new IntegrationTestHelper();
	var lineHeight = testHelper.LINE_HEIGHT;

	[
		{ limit: undefined, count: 3 },
		{ limit: null, count: 3 },
		{ limit: -1, count: 3 },
		{ limit: 0, count: 0 },
		{ limit: lineHeight - 0.000001, count: 0 },
		{ limit: lineHeight, count: 1 },
		{ limit: lineHeight + 0.000001, count: 1 },
		{ limit: 2 * lineHeight - 0.000001, count: 1 },
		{ limit: 2 * lineHeight, count: 2 },
		{ limit: 2 * lineHeight + 0.000001, count: 2 },
		{ limit: 3 * lineHeight, count: 3 }
	].forEach(function (sample) {
		it('renders ' + sample.count + ' lines with maxHeight ' + sample.limit, function () {
			var pages = testHelper.renderPages('A5', {
				content: [{ text: 'T0\nT1\nT2', maxHeight: sample.limit }, 'AFTER']
			});
			assert.equal(pages.length, 1);
			var lines = pages[0].items.map(item => item.item);
			assert.deepEqual(lines.map(line => line.inlines.map(inline => inline.text).join('')),
				['T0', 'T1', 'T2'].slice(0, sample.count).concat('AFTER'));
			assert.equal(lines[lines.length - 1].y, testHelper.MARGINS.top + sample.count * lineHeight);
		});
	});

	[0, -0.000001].forEach(function (offset) {
		it('uses the sum of different line heights with limit offset ' + offset, function () {
			var pages = testHelper.renderPages('A5', {
				content: [{
					text: [{ text: 'T0\n', fontSize: 12 }, { text: 'T1\n', fontSize: 24 }, { text: 'T2', fontSize: 6 }],
					maxHeight: 3 * lineHeight + offset
				}, 'AFTER']
			});
			var expected = offset === 0 ? ['T0', 'T1', 'AFTER'] : ['T0', 'AFTER'];
			assert.deepEqual(pages[0].items.map(item => item.item.inlines.map(inline => inline.text).join('')), expected);
		});
	});

	it('keeps an exact height limit across a page break', function () {
		var pages = testHelper.renderPages('A6', {
			content: [Array(23).fill('PRE').join('\n'), { text: 'T0\nT1\nT2', maxHeight: 2 * lineHeight }]
		});
		assert.equal(pages.length, 2);
		assert.equal(pages[0].items[23].item.inlines[0].text, 'T0');
		assert.equal(pages[1].items.length, 1);
		assert.equal(pages[1].items[0].item.inlines[0].text, 'T1');
	});

	it('renders a page reference to a target that fits the exact height limit', function () {
		var pages = testHelper.renderPages('A5', {
			content: [{ id: 'TARGET', text: 'T0\nT1', maxHeight: lineHeight }, { pageReference: 'TARGET' }]
		});
		var doc = testHelper.pdfDocument;
		try {
			new Renderer(doc).renderPages(pages);
			assert.equal(pages[0].items[1].item.inlines[0].text, '1');
		} finally {
			doc.end();
			doc.resume();
		}
	});
});
