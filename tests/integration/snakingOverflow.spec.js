'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');
var PageElementWriter = require('../../js/PageElementWriter').default;

describe('Integration test: snaking text overflow', function () {
	var contentError = /^Error: Content cannot fit on a page within the available space\.$/;

	function render(definition) {
		var original = PageElementWriter.prototype.moveToNextPage;
		var moves = 0;
		PageElementWriter.prototype.moveToNextPage = function (...args) {
			if (++moves > 100) {
				throw new Error('Page limit exceeded while testing snaking overflow.');
			}
			return original.apply(this, args);
		};
		try {
			return new IntegrationTestHelper().renderPages('A6', definition);
		} finally {
			PageElementWriter.prototype.moveToNextPage = original;
		}
	}

	function document(text, headerLines, dontBreakRows, widths, unbreakable) {
		var columns = widths.map((width, index) => index === 0 ? { width, text, fontSize: 96 } : { width, text: '' });
		var table = { table: {
			headerRows: headerLines ? 1 : 0,
			dontBreakRows,
			body: (headerLines ? [[{ text: Array.from({ length: headerLines }, (_, i) => 'H' + i).join('\n') }]] : [])
				.concat([[{ snakingColumns: true, columns }]])
		} };
		return { content: [unbreakable ? { unbreakable: true, stack: [table] } : table] };
	}

	function lines(pages) {
		return pages.flatMap((page, index) => page.items.filter(entry => entry.type === 'line')
			.map(entry => ({ text: entry.item.inlines.map(inline => inline.text).join(''), x: entry.item.x, page: index + 1 })));
	}

	[false, true].forEach(function (dontBreakRows) {
		[false, true].forEach(function (unbreakable) {
			[[undefined, undefined], [80, 80], [60, 60, 60]].forEach(function (widths) {
				it('rejects an impossible line, dontBreakRows=' + dontBreakRows + ', unbreakable=' + unbreakable + ', widths=' + widths, function () {
					assert.throws(() => render(document('BIG', 20, dontBreakRows, widths, unbreakable)), contentError);
				});
			});
		});

		[0, 12].forEach(function (headerLines) {
			it('preserves a line that fits, headerLines=' + headerLines + ', dontBreakRows=' + dontBreakRows, function () {
				var pages = render(document('BIG', headerLines, dontBreakRows, [undefined, undefined], false));
				assert.equal(pages.length, 1);
				assert.equal(lines(pages).filter(line => line.text === 'BIG').length, 1);
			});
		});

		it('preserves divisible text below a tall header, dontBreakRows=' + dontBreakRows, function () {
			var expected = Array.from({ length: 60 }, (_, i) => 'L' + i);
			var definition = document(expected.join('\n'), 20, dontBreakRows, [80, 80], true);
			definition.content[0].stack[0].table.body[1][0].columns[0].fontSize = 12;
			assert.deepEqual(lines(render(definition)).map(line => line.text).filter(text => /^L\d+$/.test(text)), expected);
		});
	});

	it('tries a narrower third column after two identical failures and resets after placing text', function () {
		var pages = render({ content: [
			{ text: Array.from({ length: 22 }, () => 'prefix').join('\n') },
			{ snakingColumns: true, columns: [
				{ width: 70, text: [{ text: 'A ', fontSize: 12 }, { text: 'I', fontSize: 96 }] },
				{ width: 70, text: '' },
				{ width: 30, text: '' }
			] }
		] });
		var result = lines(pages).filter(line => line.text.trim() === 'A' || line.text === 'I');
		assert.deepEqual(result.map(line => ({ text: line.text.trim(), x: line.x, page: line.page })), [
			{ text: 'A', x: 180, page: 1 },
			{ text: 'I', x: 40, page: 2 }
		]);
	});
});
