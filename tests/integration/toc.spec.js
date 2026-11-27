'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');
var LayoutBuilder = require('../../js/LayoutBuilder').default;
var Renderer = require('../../js/Renderer').default;

describe('Integration test: oversized table of contents entries', function () {
	var originalTryLayout;
	var passes;

	beforeEach(function () {
		passes = 0;
		originalTryLayout = LayoutBuilder.prototype.tryLayoutDocument;
		LayoutBuilder.prototype.tryLayoutDocument = function (...args) {
			assert.ok(++passes <= 6, 'table of contents layout must converge');
			return originalTryLayout.apply(this, args);
		};
	});

	afterEach(function () {
		LayoutBuilder.prototype.tryLayoutDocument = originalTryLayout;
	});

	function entryLines(prefix) {
		return Array.from({ length: 60 }, (_, index) => prefix + index);
	}

	function allTexts(pages) {
		return pages.flatMap(page => page.items.filter(entry => entry.type === 'line')
			.map(entry => entry.item.inlines.map(inline => inline.text).join('')));
	}

	it('splits a long entry and preserves its text, destination and page reference', function () {
		var helper = new IntegrationTestHelper();
		var expected = entryLines('entry-');
		var toc = { toc: { title: { text: 'Contents' } } };
		var heading = { id: 'long-entry', text: expected.join('\n'), tocItem: true };
		var pages = helper.renderPages('A6', { content: [toc, heading] });

		assert.equal(passes, 2);
		assert.deepEqual(allTexts(pages).filter(text => text.startsWith('entry-')), expected.concat(expected));
		var entryPages = pages.flatMap((page, index) => page.items
			.filter(entry => entry.type === 'line' && entry.item.inlines[0].text.startsWith('entry-') &&
				entry.item.inlines[0].linkToDestination === 'long-entry')
			.map(() => index + 1));
		assert.equal(entryPages.length, 60);
		assert.ok(new Set(entryPages).size > 1);

		new Renderer(helper.pdfDocument).renderPages(pages);
		var reference = pages.flatMap(page => page.items).find(entry => entry.type === 'line' && entry.item._pageNodeRef === heading);
		assert.equal(reference.item.inlines[0].text, heading.positions[0].pageNumber.toString());
		helper.pdfDocument.end();
	});

	it('preserves long entries in multiple contents with different sorting and styles', function () {
		var expected = entryLines('Z-entry-');
		var first = { toc: { id: 'first', sortBy: 'title', textStyle: { color: 'red' } } };
		var second = { toc: { id: 'second', textStyle: { color: 'blue' } } };
		var pages = new IntegrationTestHelper().renderPages('A6', { content: [first, second,
			{ text: expected.join('\n'), tocItem: ['first', 'second'] },
			{ text: 'A-entry', tocItem: ['first', 'second'] }
		] });

		assert.deepEqual(allTexts(pages).filter(text => text.startsWith('Z-entry-')), expected.concat(expected, expected));
		assert.equal(allTexts(pages).filter(text => text === 'A-entry').length, 3);
		function coloredEntries(color) {
			return pages.flatMap(page => page.items).filter(entry => entry.type === 'line' &&
				entry.item.inlines[0].color === color).map(entry => entry.item.inlines.map(inline => inline.text).join(''))
				.filter(text => text === 'A-entry' || text.startsWith('Z-entry-'));
		}
		assert.deepEqual(coloredEntries('red'), ['A-entry'].concat(expected));
		assert.deepEqual(coloredEntries('blue'), expected.concat(['A-entry']));
	});

	it('preserves separate occurrences of the same source entry', function () {
		var expected = entryLines('repeated-');
		var pages = new IntegrationTestHelper().renderPages('A6', { content: [
			{ toc: { id: 'index' } },
			{ text: expected.join('\n'), tocItem: ['index', 'index'] }
		] });
		assert.equal(passes, 2);
		assert.deepEqual(allTexts(pages).filter(text => text.startsWith('repeated-')), expected.concat(expected, expected));
	});

	it('keeps a short entry together when only the remaining space is too small', function () {
		var toc = { toc: {} };
		var pages = new IntegrationTestHelper().renderPages('A6', { content: [
			{ text: Array(22).fill('before').join('\n') }, toc,
			{ id: 'short-entry', text: 'short-0\nshort-1\nshort-2', tocItem: true }
		] });
		var entryPages = pages.flatMap((page, index) => page.items
			.filter(entry => entry.type === 'line' && entry.item.inlines[0].text.startsWith('short-') &&
				entry.item.inlines[0].linkToDestination === 'short-entry')
			.map(() => index + 1));
		assert.equal(passes, 1);
		assert.deepEqual([...new Set(entryPages)], [2]);
		assert.deepEqual(allTexts(pages).filter(text => text.startsWith('short-')), [
			'short-0', 'short-1', 'short-2', 'short-0', 'short-1', 'short-2'
		]);
	});
});
