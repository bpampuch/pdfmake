'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');

describe('Integration test: explicit page breaks', function () {
	var testHelper = new IntegrationTestHelper();

	[1, 2, 3, 4].forEach(function (startPage) {
		[
			{ mode: 'before', parity: null },
			{ mode: 'after', parity: null },
			{ mode: 'beforeOdd', parity: 1 },
			{ mode: 'afterOdd', parity: 1 },
			{ mode: 'beforeEven', parity: 0 },
			{ mode: 'afterEven', parity: 0 }
		].forEach(function (sample) {
			it('applies ' + sample.mode + ' from page ' + startPage, function () {
				var prefix = Array.from({ length: startPage - 1 }, (_, i) => ({ text: 'PREFIX' + i, pageBreak: 'after' }));
				var pages = testHelper.renderPages('A6', {
					content: prefix.concat([{ text: 'A' }, { text: 'B', pageBreak: sample.mode }, { text: 'C' }])
				});
				var targetPage = startPage + 1;
				if (sample.parity !== null && targetPage % 2 !== sample.parity) {
					targetPage++;
				}
				var expected = Array.from({ length: targetPage }, () => []);
				prefix.forEach((node, i) => expected[i].push(node.text));
				var before = sample.mode.startsWith('before');
				expected[startPage - 1] = before ? ['A'] : ['A', 'B'];
				expected[targetPage - 1] = before ? ['B', 'C'] : ['C'];
				assert.deepEqual(pages.map(page => page.items.map(item => item.item.inlines.map(inline => inline.text).join(''))), expected);
			});
		});
	});

	[1, 2].forEach(function (startPage) {
		[{ mode: 'afterOdd', parity: 1 }, { mode: 'afterEven', parity: 0 }].forEach(function (sample) {
			it('applies ' + sample.mode + ' after text spanning two pages from page ' + startPage, function () {
				var prefix = startPage === 2 ? [{ text: 'PREFIX', pageBreak: 'after' }] : [];
				var pages = testHelper.renderPages('A6', {
					content: prefix.concat([{ text: Array(30).fill('LONG').join('\n'), pageBreak: sample.mode }, { text: 'TARGET' }])
				});
				var targetPage = startPage + 2;
				if (targetPage % 2 !== sample.parity) {
					targetPage++;
				}
				assert.equal(pages.length, targetPage);
				assert.deepEqual(testHelper.getInlineTexts(pages, { page: targetPage - 1, item: 0 }), ['TARGET']);
				var longLines = pages.flatMap(page => page.items.filter(item => item.item.inlines[0].text === 'LONG'));
				assert.equal(longLines.length, 30);
				if (targetPage === startPage + 3) {
					assert.equal(pages[targetPage - 2].items.length, 0);
				}
			});
		});
	});
});
