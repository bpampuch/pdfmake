'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: unbreakable overflow policy', function () {
	var strict = { unbreakableOverflow: 'error' };
	var overflow = { code: 'UNBREAKABLE_BLOCK_OVERFLOW' };

	function lines(count) {
		return Array.from({ length: count }, (_, index) => ({ text: 'L' + index }));
	}

	function render(content, options) {
		return new IntegrationTestHelper().renderPages('A6', { content: content }, options);
	}

	function texts(pages) {
		return pages.flatMap(page => page.items.filter(item => item.type === 'line')
			.map(item => item.item.inlines.map(inline => inline.text).join('')));
	}

	it('keeps a short block on the current page or moves it intact', function () {
		[0, 20].forEach(count => {
			var pages = render(lines(count).concat([{ unbreakable: true, stack: lines(8) }]), strict);
			assert.equal(pages.length, count ? 2 : 1);
			assert.deepEqual(texts([pages[pages.length - 1]]), lines(8).map(node => node.text));
		});
	});

	var cases = {
		block: () => ({ unbreakable: true, stack: lines(60) }),
		row: () => ({ table: { dontBreakRows: true, body: [['first'], [{ stack: lines(60) }]] } }),
		keepWithHeaderRows: () => ({ table: { headerRows: 1, keepWithHeaderRows: 1, body: [['header'], [{ stack: lines(60) }]] } }),
		rowBelowHeader: () => ({ table: { headerRows: 1, dontBreakRows: true, body: [[{ stack: lines(8) }], [{ stack: lines(18) }]] } }),
		rowSpan: () => ({ table: { dontBreakRows: true, body: [[{ rowSpan: 2, stack: lines(60) }, 'right'], ['', 'last']] } }),
		nested: () => ({ unbreakable: true, stack: [{ table: { headerRows: 1, body: [['header'], [{ stack: lines(60) }]] } }] })
	};

	Object.keys(cases).forEach(name => {
		it('rejects overflowing ' + name + ' in error mode', function () {
			assert.throws(() => render([cases[name]()], strict), overflow);
		});
		it('preserves the default fallback for ' + name, function () {
			var defaults = render([cases[name]()]);
			var allowed = render([cases[name]()], { unbreakableOverflow: 'allowBreak' });
			assert.ok(defaults.length > 1);
			assert.deepEqual(texts(allowed), texts(defaults));
		});
	});

	['before', 'after', 'beforeOdd', 'afterOdd', 'beforeEven', 'afterEven'].forEach(pageBreak => {
		it('allows a break ' + pageBreak + ' the enclosing block', function () {
			var pages = render([{ text: 'before' }, { unbreakable: true, pageBreak: pageBreak, stack: lines(2) }, 'after'], strict);
			assert.deepEqual(texts(pages), ['before', 'L0', 'L1', 'after']);
		});
		it('rejects a break ' + pageBreak + ' a descendant', function () {
			assert.throws(() => render([{ unbreakable: true, stack: ['first', { text: 'second', pageBreak: pageBreak }, 'last'] }], strict), overflow);
		});
		it('rejects a break on a cell that bypasses the row transaction', function () {
			assert.throws(() => render([{ table: { dontBreakRows: true, body: [['first'], [{ text: 'second', pageBreak: pageBreak }], ['last']] } }], strict), overflow);
		});
	});

	it('preserves the existing oversized header error in allowBreak mode', function () {
		assert.throws(() => render([{ table: { headerRows: 1, body: [[{ stack: lines(60) }], ['body']] } }], { unbreakableOverflow: 'allowBreak' }), /Table header cannot fit/);
	});

	it('rejects an oversized header in error mode', function () {
		assert.throws(() => render([{ table: { headerRows: 1, body: [[{ stack: lines(60) }], ['body']] } }], strict), overflow);
	});

	['header', 'footer', 'background'].forEach(property => {
		it('keeps the document ' + property + ' outside the new policy', function () {
			function definition() {
				return { content: ['body'], [property]: () => ({ stack: lines(60) }) };
			}
			var defaults = new IntegrationTestHelper().renderPages('A6', definition());
			var result = new IntegrationTestHelper().renderPages('A6', definition(), strict);
			assert.deepEqual(texts(result), texts(defaults));
		});
	});

	it('allows a short row to move intact below a repeating header', function () {
		var pages = render([{ table: { headerRows: 1, dontBreakRows: true, body: [['header'], [{ stack: lines(15) }], [{ stack: lines(8) }]] } }], strict);
		assert.equal(pages.length, 2);
		assert.deepEqual(texts([pages[1]]), ['header'].concat(lines(8).map(node => node.text)));
	});

	it('allows a short block in snaking columns', function () {
		var pages = render([{ snakingColumns: true, columns: [{ stack: [{ unbreakable: true, stack: lines(8) }] }, {}] }], strict);
		assert.deepEqual(texts(pages), lines(8).map(node => node.text));
	});

	it('rejects an oversized block in snaking columns', function () {
		assert.throws(() => render([{ snakingColumns: true, columns: [{ stack: [cases.block()] }, {}] }], strict), overflow);
	});

	it('keeps existing atomic insertion errors in both modes', function () {
		[undefined, strict].forEach(options => {
			assert.throws(() => render([{ text: 'too tall', fontSize: 1000 }], options), /Content cannot fit on a page/);
		});
	});

	it('rejects through the public API and isolates concurrent policies', async function () {
		var pdfmake = require('../../js/index');
		pdfmake.addFonts(require('../../fonts/Roboto'));
		pdfmake.setLocalAccessPolicy(() => true);
		pdfmake.setUrlAccessPolicy(() => false);
		function definition() {
			return { pageSize: 'A6', content: [cases.block()] };
		}
		await Promise.all([
			assert.rejects(pdfmake.createPdf(definition(), strict).getBuffer(), overflow),
			pdfmake.createPdf(definition(), { unbreakableOverflow: 'allowBreak' }).getBuffer().then(buffer => assert.ok(buffer.length > 0))
		]);
		assert.ok((await pdfmake.createPdf(definition()).getBuffer()).length > 0);
	});

	it('allows long unbreakable content on an automatically sized page', async function () {
		var pdfmake = require('../../js/index');
		pdfmake.addFonts(require('../../fonts/Roboto'));
		pdfmake.setLocalAccessPolicy(() => true);
		pdfmake.setUrlAccessPolicy(() => false);
		var buffer = await pdfmake.createPdf({ pageSize: { width: 300, height: 'auto' }, content: [cases.block()] }, strict).getBuffer();
		assert.ok(buffer.length > 0);
	});

	it('rejects write before opening an output file', async function () {
		var pdfmake = require('../../js/index');
		pdfmake.addFonts(require('../../fonts/Roboto'));
		pdfmake.setLocalAccessPolicy(() => true);
		pdfmake.setUrlAccessPolicy(() => false);
		var fs = require('fs');
		var path = require('path');
		var directory = fs.mkdtempSync(path.join(require('os').tmpdir(), 'pdfmake-overflow-'));
		var filename = path.join(directory, 'output.pdf');
		try {
			await assert.rejects(pdfmake.createPdf({ pageSize: 'A6', content: [cases.block()] }, strict).write(filename), overflow);
			assert.equal(fs.existsSync(filename), false);
		} finally {
			fs.rmdirSync(directory);
		}
	});

	[null, false, 'split', 'unknown'].forEach(value => {
		it('rejects invalid policy ' + value + ' before resolving sources', async function () {
			var Printer = require('../../js/Printer').default;
			var printer = new Printer({});
			printer.resolveUrls = () => { throw new Error('Sources must not be resolved'); };
			await assert.rejects(printer.createPdfKitDocument({ content: [] }, { unbreakableOverflow: value }), /Invalid unbreakableOverflow option/);
		});
	});
});
