'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');
var LayoutBuilder = require('../../js/LayoutBuilder').default;

describe('Integration test: oversized unbreakable blocks', function () {
	var testHelper = new IntegrationTestHelper();

	function lines(count, prefix) {
		return Array.from({ length: count }, (_, index) => ({ text: prefix + index }));
	}

	function texts(page) {
		return page.items.filter(item => item.type === 'line').map(item => item.item.inlines.map(inline => inline.text).join(''));
	}

	function allTexts(pages) {
		return pages.flatMap(texts);
	}

	[0, 1].forEach(function (headerRows) {
		[1, 3].forEach(function (lineWidth) {
			[false, true].forEach(function (hLineWhenBroken) {
				it('draws the top border after moving a released row, headerRows=' + headerRows + ', lineWidth=' + lineWidth + ', hLineWhenBroken=' + hLineWhenBroken, function () {
					var expectedTexts = lines(35, 'L').map(node => node.text);
					var pages = testHelper.renderPages('A6', { content: [{
						layout: {
							hLineWidth: () => lineWidth,
							hLineWhenBroken: hLineWhenBroken
						},
						table: {
							widths: [100],
							dontBreakRows: true,
							headerRows: headerRows,
							body: (headerRows ? [['HEADER']] : []).concat([['FIRST'], [{ text: expectedTexts.join('\n') }]])
						}
					}] });

					assert.equal(pages.length, 3);
					assert.deepEqual(allTexts(pages).filter(text => /^L\d+$/.test(text)), expectedTexts);
					assert.equal(allTexts(pages).filter(text => text === 'FIRST').length, 1);
					assert.equal(allTexts(pages).filter(text => text === 'HEADER').length, headerRows ? pages.length : 0);
					pages.slice(1).forEach(page => {
						var vectors = page.items.filter(entry => entry.type === 'vector' && entry.item.type === 'line').map(entry => entry.item);
						var borderY = testHelper.MARGINS.top + (headerRows ? lineWidth + testHelper.LINE_HEIGHT + 4 + lineWidth / 2 : lineWidth / 2);
						assert.equal(vectors.filter(vector => vector.y1 === borderY && vector.y2 === borderY).length, headerRows || hLineWhenBroken ? 1 : 0);
						if (headerRows || hLineWhenBroken) {
							vectors.filter(vector => vector.x1 === vector.x2).forEach(vector => assert.ok(vector.y1 >= testHelper.MARGINS.top));
							var firstLine = page.items.find(entry => entry.type === 'line' && /^L\d+$/.test(entry.item.inlines[0].text)).item;
							assert.equal(firstLine.y, borderY + lineWidth / 2 + 2);
						}
					});
				});
			});
		});
	});

	[false, true].forEach(function (dontBreakRows) {
		[0, 10].forEach(function (topMargin) {
			it('starts an oversized cell beside its sibling, dontBreakRows=' + dontBreakRows + ', margin=' + topMargin, function () {
				['left', 'right'].forEach(function (side) {
					var cell = { margin: [0, topMargin, 0, 0], stack: [
						{ unbreakable: true, text: lines(60, 'L').map(node => node.text).join('\n') }
					] };
					var pages = testHelper.renderPages('A6', { content: [{ table: {
						widths: [90, 90],
						dontBreakRows: dontBreakRows,
						body: [side === 'right' ? ['SHORT', cell] : [cell, 'SHORT']]
					} }] });

					assert.equal(pages.length, 3);
					assert.deepEqual(allTexts(pages).filter(text => /^L\d+$/.test(text)), lines(60, 'L').map(node => node.text));
					assert.equal(allTexts(pages).filter(text => text === 'SHORT').length, 1);
					assert.ok(texts(pages[0]).includes('SHORT'));
					var firstLine = pages[0].items.find(item => item.type === 'line' && item.item.inlines[0].text === 'L0').item;
					assert.equal(firstLine.x, side === 'right' ? 144 : 45);
					assert.equal(firstLine.y, 43 + topMargin);
				});
			});
		});

		it('moves an oversized block after preceding content in its own cell, dontBreakRows=' + dontBreakRows, function () {
			var pages = testHelper.renderPages('A6', { content: [{ table: {
				widths: [90, 90],
				dontBreakRows: dontBreakRows,
				body: [['SHORT', { stack: [
					{ text: 'PREFIX' },
					{ unbreakable: true, text: lines(60, 'L').map(node => node.text).join('\n') }
				] }]]
			} }] });

			assert.equal(pages.length, 4);
			assert.deepEqual(texts(pages[0]), ['SHORT', 'PREFIX']);
			assert.equal(texts(pages[1])[0], 'L0');
			assert.deepEqual(allTexts(pages).filter(text => /^L\d+$/.test(text)), lines(60, 'L').map(node => node.text));
		});

		['header', 'rowSpan'].forEach(function (type) {
			it('starts an oversized cell beside its sibling with ' + type + ', dontBreakRows=' + dontBreakRows, function () {
				var cell = { unbreakable: true, text: lines(60, 'L').map(node => node.text).join('\n') };
				if (type === 'rowSpan') {
					cell.rowSpan = 2;
				}
				var pages = testHelper.renderPages('A6', { content: [{ table: {
					widths: [90, 90],
					dontBreakRows: dontBreakRows,
					headerRows: type === 'header' ? 1 : 0,
					body: (type === 'header' ? [['H1', 'H2']] : []).concat([
						['SHORT', cell]
					], type === 'rowSpan' ? [['END', {}]] : [])
				} }] });

				assert.equal(pages.length, 3);
				assert.ok(texts(pages[0]).includes('SHORT'));
				assert.ok(texts(pages[0]).includes('L0'));
				assert.deepEqual(allTexts(pages).filter(text => /^L\d+$/.test(text)), lines(60, 'L').map(node => node.text));
				if (type === 'header') {
					pages.forEach(page => assert.deepEqual(texts(page).slice(0, 2), ['H1', 'H2']));
				} else {
					assert.equal(allTexts(pages).filter(text => text === 'END').length, 1);
				}
			});
		});
	});

	['static', 'dynamic', null].forEach(function (repeatableType) {
		it('inherits section settings after retrying layout with ' + repeatableType + ' repeatables', function () {
			var inheritedProperties = ['pageSize', 'pageOrientation', 'pageMargins', 'header', 'footer', 'background', 'watermark'];
			function inheritedSection(label) {
				var section = { section: [{ text: label }] };
				inheritedProperties.forEach(property => section[property] = 'inherit');
				return section;
			}
			function repeatable(label) {
				if (repeatableType === null) {
					return null;
				}
				var node = { text: label, fontSize: 6 };
				return repeatableType === 'dynamic' ? () => ({ ...node }) : node;
			}
			var inherited = inheritedSection('inherited');
			var chained = inheritedSection('chained');
			var pages = testHelper.renderPages('A6', {
				content: [
					{ text: 'before' },
					{ unbreakable: true, stack: lines(30, 'before-section-').concat([{
						section: [{ text: 'landscape' }],
						pageSize: 'A5',
						pageOrientation: 'landscape',
						pageMargins: 15,
						header: repeatable('header'),
						footer: repeatable('footer'),
						background: repeatableType === null ? null : { text: 'background', fontSize: 6 },
						watermark: repeatableType === null ? null : { text: 'watermark', fontSize: 10 }
					}]) },
					inherited,
					chained
				]
			});

			assert.deepEqual(allTexts(pages).filter(text => text.startsWith('before-section-')), lines(30, 'before-section-').map(node => node.text));
			var precedingPage = pages.find(page => texts(page).includes('landscape'));
			assert.equal(precedingPage.pageSize.orientation, 'landscape');
			assert.equal(precedingPage.pageMargins.left, 15);
			['inherited', 'chained'].forEach(label => {
				var page = pages.find(page => texts(page).includes(label));
				assert.deepStrictEqual(page.pageSize, precedingPage.pageSize);
				assert.deepStrictEqual(page.pageMargins, precedingPage.pageMargins);
				['header', 'footer', 'background', 'watermark'].forEach(property => {
					assert.strictEqual(page.customProperties[property], precedingPage.customProperties[property]);
				});
				['header', 'footer', 'background'].forEach(text => {
					assert.equal(texts(page).includes(text), repeatableType !== null);
				});
				assert.equal(page.watermark ? page.watermark.text : undefined, repeatableType === null ? undefined : 'watermark');
			});
			[inherited, chained].forEach(section => {
				inheritedProperties.forEach(property => assert.equal(section[property], 'inherit'));
			});
		});
	});

	['*', 80].forEach(function (firstColumnWidth) {
		it('starts an oversized block in the first snaking column on a new page, width=' + firstColumnWidth, function () {
			var pages = testHelper.renderPages('A6', {
				content: [{
					snakingColumns: true,
					columnGap: 10,
					columns: [{ width: firstColumnWidth, stack: lines(30, 'before-').concat([
						{ unbreakable: true, stack: lines(60, 'long-') }
					]) }, { width: '*', text: '' }]
				}, { text: 'after' }]
			});

			assert.equal(pages.length, 3);
			assert.deepEqual(allTexts(pages), lines(30, 'before-').concat(lines(60, 'long-')).map(node => node.text).concat(['after']));
			var firstLine = pages[1].items.find(item => item.type === 'line' && item.item.inlines[0].text === 'long-0').item;
			assert.equal(firstLine.x, testHelper.MARGINS.left);
			assert.equal(firstLine.y, testHelper.MARGINS.top);
			var columnWidth = firstColumnWidth === '*' ? (pages[1].pageSize.width - 80 - 10) / 2 : firstColumnWidth;
			pages.forEach(page => {
				page.items.filter(item => item.type === 'line' && item.item.inlines[0].text.startsWith('long-')).forEach(item => {
					var left = Math.abs(item.item.x - testHelper.MARGINS.left) < 0.000001;
					var expectedWidth = left ? columnWidth : page.pageSize.width - 80 - 10 - columnWidth;
					assert.ok(Math.abs(item.item.maxWidth - expectedWidth) < 0.000001);
				});
			});
		});
	});

	['center', 'right'].forEach(function (tableAlignment) {
		it('keeps an oversized row and its repeated header aligned after restarting snaking columns, alignment=' + tableAlignment, function () {
			var pages = testHelper.renderPages('A6', {
				content: [{
					snakingColumns: true,
					columnGap: 10,
					columns: [{ stack: lines(30, 'before-').concat([{ tableAlignment: tableAlignment, table: {
						widths: [40],
						headerRows: 1,
						dontBreakRows: true,
						body: [['H'], ['short'], [{ stack: lines(60, 'L') }], ['end']]
					} }]) }, {}]
				}]
			});

			assert.deepEqual(allTexts(pages).filter(text => /^L\d+$/.test(text)), lines(60, 'L').map(node => node.text));
			var columnWidth = (pages[0].pageSize.width - 80 - 10) / 2;
			var offset = (columnWidth - 50) / (tableAlignment === 'center' ? 2 : 1);
			var expectedX = testHelper.MARGINS.left + offset + 5;
			pages.filter(page => texts(page).some(text => /^L\d+$/.test(text))).forEach(page => {
				assert.equal(texts(page)[0], 'H');
				page.items.filter(item => item.type === 'line' && (item.item.inlines[0].text === 'H' || /^L\d+$/.test(item.item.inlines[0].text))).forEach(item => {
					assert.ok(Math.abs(item.item.x - expectedX) < 0.000001, 'Unexpected x: ' + item.item.x);
				});
			});
		});
	});

	[12, 24].forEach(function (cellLineCount) {
		it('preserves rowSpan vertical alignment after retrying the layout with ' + cellLineCount + ' cell lines', function () {
			function render(unbreakable) {
				return testHelper.renderPages('A6', {
					content: [{ unbreakable: unbreakable, stack: lines(60, 'before-') }, { table: {
						widths: ['*', '*'],
						body: [
							[{ text: 'middle', rowSpan: 2, verticalAlignment: 'middle' }, { stack: lines(cellLineCount, 'right-') }],
							[{}, { stack: lines(3, 'last-') }]
						]
					} }]
				});
			}

			function alignment(pages) {
				return pages.flatMap((page, index) => page.items.filter(item => item.type === 'beginVerticalAlignment').map(item => ({
					page: index,
					height: item.item.getViewHeight(),
					offset: (item.item.getViewHeight() - item.item.getNodeHeight()) / 2
				})));
			}

			var expected = render(false);
			var actual = render(true);
			assert.deepEqual(allTexts(actual), allTexts(expected));
			assert.equal(actual.length, expected.length);
			assert.ok(alignment(expected)[0].height > 0);
			assert.deepEqual(alignment(actual), alignment(expected));
		});
	});

	[false, true].forEach(function (precedingContent) {
		it('preserves an oversized stack starting on ' + (precedingContent ? 'a new' : 'the first') + ' page (#207)', function () {
			var stack = lines(60, 'line-');
			var content = precedingContent ? [{ text: 'before' }] : [];
			content.push({ unbreakable: true, stack: stack }, { text: 'after' });

			var pages = testHelper.renderPages('A6', { content: content });

			assert.deepEqual(allTexts(pages), (precedingContent ? ['before'] : []).concat(stack.map(node => node.text), ['after']));
			assert.equal(texts(pages[precedingContent ? 1 : 0])[0], 'line-0');
			if (precedingContent) {
				assert.deepEqual(texts(pages[0]), ['before']);
			}
			pages.forEach(page => assert.ok(texts(page).length > 0));
		});
	});

	it('keeps a block that fits on a page together', function () {
		var pages = testHelper.renderPages('A6', {
			content: [
				{ stack: lines(20, 'before-') },
				{ unbreakable: true, stack: lines(8, 'block-') }
			]
		});

		assert.equal(pages.length, 2);
		assert.deepEqual(texts(pages[1]), lines(8, 'block-').map(node => node.text));
	});

	it('preserves nested oversized blocks and keeps short nested blocks together', function () {
		var pages = testHelper.renderPages('A6', {
			content: [
				{ text: 'before' },
				{ unbreakable: true, stack: [
					{ unbreakable: true, stack: lines(60, 'long-') },
					{ unbreakable: true, stack: lines(8, 'short-') }
				] },
				{ text: 'after' }
			]
		});

		assert.deepEqual(allTexts(pages), ['before'].concat(lines(60, 'long-').map(node => node.text), lines(8, 'short-').map(node => node.text), ['after']));
		assert.equal(pages.filter(page => texts(page).some(text => text.startsWith('short-'))).length, 1);
		assert.deepEqual(texts(pages[0]), ['before']);
	});

	describe('redundant unbreakable wrappers (#207-14)', function () {
		function wrap(node, depth) {
			for (var i = 0; i < depth; i++) {
				node = { unbreakable: true, stack: [node] };
			}
			return node;
		}

		function renderWithPassCount(docDefinition) {
			var originalTryLayout = LayoutBuilder.prototype.tryLayoutDocument;
			var passes = 0;
			LayoutBuilder.prototype.tryLayoutDocument = function (...args) {
				passes++;
				return originalTryLayout.apply(this, args);
			};
			try {
				var pages = testHelper.renderPages('A6', docDefinition);
				return { pages: pages, passes: passes };
			} finally {
				LayoutBuilder.prototype.tryLayoutDocument = originalTryLayout;
			}
		}

		function textLayout(pages) {
			return pages.map(page => page.items.filter(entry => entry.type === 'line').map(entry => ({
				text: entry.item.inlines.map(inline => inline.text).join(''),
				x: entry.item.x,
				y: entry.item.y,
				width: entry.item.maxWidth
			})));
		}

		[1, 10, 40, 200].forEach(function (depth) {
			it('releases a chain of ' + depth + ' wrappers in two layout passes', function () {
				function definition(wrapperCount) {
					return { content: [
						{ text: 'sentinel' },
						wrap({ text: lines(60, 'L').map(node => node.text).join('\n') }, wrapperCount),
						{ text: 'after' }
					] };
				}
				var expected = testHelper.renderPages('A6', definition(1));
				var actual = renderWithPassCount(definition(depth));

				assert.equal(actual.passes, 2);
				assert.deepStrictEqual(allTexts(actual.pages), ['sentinel'].concat(lines(60, 'L').map(node => node.text), ['after']));
				assert.deepStrictEqual(textLayout(actual.pages), textLayout(expected));
			});
		});

		it('keeps a short sibling together when it needs a new page', function () {
			function definition(depth) {
				return { content: [
					{ text: 'sentinel' },
					{ unbreakable: true, stack: [
						wrap({ stack: lines(68, 'L') }, depth),
						{ unbreakable: true, stack: lines(8, 'S') }
					] },
					{ text: 'after' }
				] };
			}
			var expected = testHelper.renderPages('A6', definition(1));
			var actual = renderWithPassCount(definition(40));

			assert.equal(actual.passes, 3);
			assert.equal(actual.pages.length, 5);
			assert.deepStrictEqual(allTexts(actual.pages), ['sentinel'].concat(lines(68, 'L').map(node => node.text), lines(8, 'S').map(node => node.text), ['after']));
			assert.equal(actual.pages.filter(page => texts(page).some(text => /^S\d+$/.test(text))).length, 1);
			assert.deepStrictEqual(textLayout(actual.pages), textLayout(expected));
		});

		it('keeps a short chain together without retrying layout', function () {
			var actual = renderWithPassCount({ content: lines(20, 'P').concat([
				wrap({ stack: lines(8, 'S') }, 40),
				{ text: 'after' }
			]) });

			assert.equal(actual.passes, 1);
			assert.equal(actual.pages.length, 2);
			assert.deepStrictEqual(texts(actual.pages[1]), lines(8, 'S').map(node => node.text).concat(['after']));
		});

		['margin', 'style'].forEach(function (marginType) {
			it('preserves a short child when its ' + marginType + ' makes the outer block overflow', function () {
				var child = { unbreakable: true, stack: lines(8, 'S') };
				if (marginType === 'margin') {
					child.margin = [0, 260, 0, 0];
				} else {
					child.style = 'spaced';
				}
				var actual = renderWithPassCount({
					styles: { spaced: { margin: [0, 260, 0, 0] } },
					content: [{ text: 'sentinel' }, { unbreakable: true, stack: [child] }, { text: 'after' }]
				});

				assert.equal(actual.passes, 2);
				assert.equal(actual.pages.length, 3);
				assert.deepStrictEqual(texts(actual.pages[2]), lines(8, 'S').map(node => node.text).concat(['after']));
			});
		});
	});

	[0, 1].forEach(function (headerRows) {
		[0, 1].forEach(function (shortRowsBefore) {
			it('splits only an oversized table row, headerRows=' + headerRows + ', shortRowsBefore=' + shortRowsBefore, function () {
				var body = headerRows ? [[{ text: 'header' }]] : [];
				if (shortRowsBefore) {
					body.push([{ text: 'short-before' }]);
				}
				body.push([{ stack: lines(60, 'long-') }], [{ stack: lines(12, 'short-') }], [{ text: 'last-row' }]);
				var pages = testHelper.renderPages('A6', {
					content: [{ text: 'before' }, { table: { dontBreakRows: true, headerRows: headerRows, body: body } }, { text: 'after' }]
				});

				assert.deepEqual(allTexts(pages).filter(text => text !== 'header'), ['before'].concat(shortRowsBefore ? ['short-before'] : [], lines(60, 'long-').map(node => node.text), lines(12, 'short-').map(node => node.text), ['last-row', 'after']));
				assert.ok(!texts(pages[0]).includes('long-0'));
				assert.equal(pages.filter(page => texts(page).some(text => /^short-\d/.test(text))).length, 1);
				if (headerRows) {
					pages.filter(page => texts(page).some(text => text.startsWith('long-'))).forEach(page => {
						assert.equal(texts(page)[0], 'header');
					});
				}
				pages.forEach(page => {
					page.items.filter(item => item.type === 'line').forEach(item => {
						assert.ok(item.item.y >= testHelper.MARGINS.top);
						assert.ok(item.item.y + item.item.getHeight() <= page.pageSize.height - testHelper.MARGINS.bottom);
					});
				});
			});
		});
	});

	it('releases an oversized keepWithHeaderRows group and still repeats its header', function () {
		var pages = testHelper.renderPages('A6', {
			content: [{ text: 'before' }, { table: {
				headerRows: 1,
				keepWithHeaderRows: 1,
				dontBreakRows: true,
				body: [['header'], [{ stack: lines(60, 'long-') }], ['after']]
			} }]
		});

		assert.deepEqual(allTexts(pages).filter(text => text !== 'header'), ['before'].concat(lines(60, 'long-').map(node => node.text), ['after']));
		pages.filter(page => texts(page).some(text => text.startsWith('long-'))).forEach(page => assert.equal(texts(page)[0], 'header'));
	});

	[1, 2].forEach(function (headerRows) {
		it('splits a row that fits a full page but not below ' + headerRows + ' header rows (#207)', function () {
			var header = lines(8, 'header-');
			var body = Array.from({ length: headerRows }, (_, index) => [{
				stack: header.slice(index * 8 / headerRows, (index + 1) * 8 / headerRows)
			}]);
			body.push([{ stack: lines(16, 'long-') }], [{ stack: lines(8, 'short-') }], ['after']);
			var pages = testHelper.renderPages('A6', {
				content: [{ table: { headerRows: headerRows, dontBreakRows: true, body: body } }]
			});

			assert.deepEqual(allTexts(pages).filter(text => !text.startsWith('header-')),
				lines(16, 'long-').concat(lines(8, 'short-')).map(node => node.text).concat(['after']));
			assert.equal(pages.filter(page => texts(page).some(text => text.startsWith('short-'))).length, 1);
			assert.ok(pages.filter(page => texts(page).some(text => text.startsWith('long-'))).length > 1);
			pages.forEach(page => {
				assert.deepEqual(texts(page).slice(0, 8), header.map(node => node.text));
				page.items.filter(item => item.type === 'line').forEach(item => {
					assert.ok(item.item.y >= testHelper.MARGINS.top);
					assert.ok(item.item.y + item.item.getHeight() <= page.pageSize.height - testHelper.MARGINS.bottom);
				});
			});
		});
	});

	it('restores long paragraph text and canvas positions when retrying the layout', function () {
		var vector = { type: 'rect', x: 3, y: 4, w: 10, h: 10 };
		var paragraph = lines(60, 'text-').map(node => node.text).join('\n');
		var pages = testHelper.renderPages('A6', {
			content: [{ canvas: [vector] }, { unbreakable: true, text: paragraph }, { text: 'after' }]
		});

		assert.deepEqual(allTexts(pages), lines(60, 'text-').map(node => node.text).concat(['after']));
		assert.equal(pages[0].items[0].item.x, testHelper.MARGINS.left + 3);
		assert.equal(pages[0].items[0].item.y, testHelper.MARGINS.top + 4);
		assert.equal(texts(pages[1])[0], 'text-0');
	});

	it('keeps both columns of an oversized row and their borders on each page', function () {
		var pages = testHelper.renderPages('A6', {
			content: [{ text: 'before' }, { table: {
				dontBreakRows: true,
				widths: ['*', '*'],
				body: [[{ stack: lines(60, 'left-') }, { stack: lines(60, 'right-') }], ['after-left', 'after-right']]
			} }]
		});

		['left-', 'right-'].forEach(prefix => {
			assert.deepEqual(allTexts(pages).filter(text => text.startsWith(prefix)), lines(60, prefix).map(node => node.text));
		});
		pages.filter(page => texts(page).some(text => text.startsWith('left-'))).forEach(page => {
			assert.ok(texts(page).some(text => text.startsWith('right-')));
			var borderXs = page.items.filter(item => item.type === 'vector' && item.item.x1 === item.item.x2).map(item => item.item.x1);
			assert.equal(new Set(borderXs).size, 3);
		});
		assert.deepEqual(texts(pages[0]), ['before']);
	});

	it('does not add a blank page before an oversized table with a top margin and background', function () {
		var pages = testHelper.renderPages('A6', {
			background: { text: 'background' },
			content: { margin: [0, 10, 0, 0], table: {
				dontBreakRows: true,
				body: [[{ stack: lines(60, 'long-') }]]
			} }
		});

		assert.deepEqual(allTexts(pages).filter(text => text !== 'background'), lines(60, 'long-').map(node => node.text));
		pages.forEach(page => assert.ok(texts(page).some(text => text.startsWith('long-'))));
	});
});
