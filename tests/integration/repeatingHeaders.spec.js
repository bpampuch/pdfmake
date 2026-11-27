'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: repeating header overflow', function () {
	var contentError = /^Error: Content cannot fit on a page within the available space\.$/;
	var headerError = /^Error: Table header cannot fit on a page within the available space\.$/;
	var elements = {
		text: () => ({ text: 'BIG', fontSize: 96 }),
		image: () => ({ image: 'examples/images/sampleImage.jpg', width: 100, height: 112 }),
		svg: () => ({ svg: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="112"><rect width="100" height="112" fill="red"/></svg>' }),
		qr: () => ({ qr: 'BIG', fit: 112 }),
		canvas: () => ({ canvas: [{ type: 'rect', x: 0, y: 0, w: 100, h: 112, color: 'red' }] }),
		attachment: () => ({ attachment: { src: 'data:text/plain;base64,SGVsbG8=', name: 'big.txt' }, width: 100, height: 112 })
	};

	function header(count) {
		return { text: Array.from({ length: count }, (_, index) => 'H' + index).join('\n') };
	}

	function document(node, headerLines, dontBreakRows) {
		return { pageSize: 'A6', content: [{ table: {
			headerRows: headerLines ? 1 : 0,
			dontBreakRows,
			body: (headerLines ? [[header(headerLines)]] : []).concat([[node], ['after']])
		} }] };
	}

	function texts(pages) {
		return pages.flatMap(page => page.items.filter(entry => entry.type === 'line')
			.map(entry => entry.item.inlines.map(inline => inline.text).join('')));
	}

	[false, true].forEach(function (dontBreakRows) {
		Object.keys(elements).forEach(function (type) {
			[0, 12, 20].forEach(function (headerLines) {
				it('handles ' + type + ', headerLines=' + headerLines + ', dontBreakRows=' + dontBreakRows, function () {
					var helper = new IntegrationTestHelper();
					var node = elements[type]();
					var render = () => helper.renderPages('A6', document(node, headerLines, dontBreakRows));
					if (headerLines === 20) {
						assert.throws(render, contentError);
					} else {
						var pages = render();
						assert.equal(pages.length, 1);
						assert.equal(texts(pages).filter(text => text === 'after').length, 1);
						assert.ok(node.positions.length > 0);
						node.positions.forEach(position => assert.equal(position.pageNumber, 1));
					}
				});
			});
		});

		[0, 1].forEach(function (keepWithHeaderRows) {
			it('rejects oversized headers, dontBreakRows=' + dontBreakRows + ', keepWithHeaderRows=' + keepWithHeaderRows, function () {
				var definition = document('body', 30, dontBreakRows);
				definition.content[0].table.keepWithHeaderRows = keepWithHeaderRows;
				assert.throws(() => new IntegrationTestHelper().renderPages('A6', definition), headerError);
			});
		});

		it('splits long text below a tall header, dontBreakRows=' + dontBreakRows, function () {
			var expected = Array.from({ length: 60 }, (_, index) => 'L' + index);
			var pages = new IntegrationTestHelper().renderPages('A6', document({ text: expected.join('\n') }, 20, dontBreakRows));
			assert.deepEqual(texts(pages).filter(text => !/^H\d+$/.test(text)), expected.concat(['after']));
			pages.forEach(page => assert.deepEqual(texts([page]).slice(0, 20), Array.from({ length: 20 }, (_, index) => 'H' + index)));
		});

		it('releases keepWithHeaderRows while preserving the header, dontBreakRows=' + dontBreakRows, function () {
			var expected = Array.from({ length: 30 }, (_, index) => 'R' + index);
			var definition = document('unused', 1, dontBreakRows);
			definition.content[0].table.body = [[header(1)]].concat(expected.map(text => [text]));
			definition.content[0].table.keepWithHeaderRows = 30;
			var pages = new IntegrationTestHelper().renderPages('A6', definition);
			assert.ok(pages.length > 1);
			assert.deepEqual(texts(pages).filter(text => text !== 'H0'), expected);
			pages.forEach(page => assert.equal(texts([page])[0], 'H0'));
		});

		it('rejects impossible content through the public API with a page reference, dontBreakRows=' + dontBreakRows, async function () {
			var pdfmake = require('../../js/index');
			pdfmake.addFonts(require('../../fonts/Roboto'));
			pdfmake.setLocalAccessPolicy(() => true);
			pdfmake.setUrlAccessPolicy(() => false);
			var definition = document({ text: 'BIG', fontSize: 96, id: 'big' }, 20, dontBreakRows);
			definition.content.push({ pageReference: 'big' });
			await assert.rejects(pdfmake.createPdf(definition).getBuffer(), contentError);
		});
	});

	it('repeats nested headers after releasing the enclosing unbreakable block', function () {
		var expected = Array.from({ length: 60 }, (_, index) => 'L' + index);
		var table = document({ text: expected.join('\n') }, 1, false).content[0];
		var pages = new IntegrationTestHelper().renderPages('A6', { content: [{ unbreakable: true, stack: [table] }] });
		assert.deepEqual(texts(pages).filter(text => text !== 'H0'), expected.concat(['after']));
		pages.forEach(page => assert.equal(texts([page])[0], 'H0'));
	});

	it('rejects a multirow header whose rows fit individually', function () {
		var definition = document('body', 0, false);
		definition.content[0].table.headerRows = 2;
		definition.content[0].table.body.unshift([header(12)], [header(12)]);
		assert.throws(() => new IntegrationTestHelper().renderPages('A6', definition), headerError);
	});

	it('uses the dimensions of document headers, footers and backgrounds', function () {
		var definition = document({ text: Array.from({ length: 30 }, () => 'body').join('\n') }, 20, true);
		definition.header = () => ({ text: 'document header', fontSize: 24 });
		definition.footer = () => ({ text: 'document footer', fontSize: 24 });
		definition.background = () => elements.canvas();
		var pages = new IntegrationTestHelper().renderPages('A6', definition);
		assert.equal(texts(pages).filter(text => text === 'body').length, 30);
		pages.forEach(page => {
			assert.ok(texts([page]).includes('document header'));
			assert.ok(texts([page]).includes('document footer'));
			assert.equal(page.items.filter(entry => entry.type === 'vector' && entry.item.color === 'red').length, 1);
		});
	});

	['nested', 'snaking'].forEach(function (mode) {
		it('rejects an impossible element in a ' + mode + ' table', function () {
			var table = document(elements.svg(), 20, true).content[0];
			var content = mode === 'nested' ? { table: { body: [[table]] } } : {
				columns: [{ width: 180, stack: [table] }, { width: 180, text: '' }], snakingColumns: true
			};
			assert.throws(() => new IntegrationTestHelper().renderPages('A6', { content: [content] }), contentError);
		});
	});
});
