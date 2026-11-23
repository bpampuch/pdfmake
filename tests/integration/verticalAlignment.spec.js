'use strict';

var assert = require('assert');
var IntegrationTestHelper = require('./integrationTestHelper');
var PDFDocument = require('../../js/PDFDocument').default;
var Renderer = require('../../js/Renderer').default;
var pdfmake = require('../../js/index');

describe('Integration test: vertical alignment across pages', function () {
	function document(count, dontBreakRows, alignment, rowSpan) {
		var cell = { text: 'SHORT', verticalAlignment: alignment };
		var sibling = { text: Array.from({ length: count }, (_, i) => 'L' + i).join('\n') };
		var body = [[cell, sibling]];
		if (rowSpan) {
			cell.rowSpan = sibling.rowSpan = 2;
			body.push([{}, {}]);
		}
		return { pageSize: 'A6', content: [{ table: { widths: ['*', '*'], dontBreakRows, body } }, { text: 'AFTER' }] };
	}

	async function renderedTexts(definition, onVector) {
		pdfmake.addFonts(require('../../fonts/Roboto'));
		pdfmake.setLocalAccessPolicy(() => true);
		pdfmake.setUrlAccessPolicy(() => false);
		var originalText = PDFDocument.prototype.text;
		var originalAddPage = PDFDocument.prototype.addPage;
		var originalVector = Renderer.prototype.renderVector;
		var rendered = [];
		var page = 0;
		var pdfDocument;
		try {
			Renderer.prototype.renderVector = function (vector) {
				if (onVector) onVector.call(this, vector);
				return originalVector.call(this, vector);
			};
			PDFDocument.prototype.addPage = function (...args) {
				if (page > 0) {
					assert.equal(this._ctmStack.length, 0, 'cell transforms must be closed before starting another page');
				}
				pdfDocument = this;
				page++;
				return originalAddPage.apply(this, args);
			};
			PDFDocument.prototype.text = function (text, x, y, ...args) {
				rendered.push({ text, page, y: y + this.page.height - this._ctm[5] });
				return originalText.call(this, text, x, y, ...args);
			};
			await pdfmake.createPdf(definition).getBuffer();
			assert.equal(pdfDocument._ctmStack.length, 0, 'cell transforms must be closed on the final page');
		} finally {
			PDFDocument.prototype.text = originalText;
			PDFDocument.prototype.addPage = originalAddPage;
			Renderer.prototype.renderVector = originalVector;
		}
		return rendered;
	}

	['top', 'middle', 'bottom'].forEach(alignment => {
		[false, true].forEach(dontBreakRows => {
			[3, 24].forEach(firstCount => {
				[3, 24].forEach(secondCount => {
					it('preserves the first shared cell alignment, alignment=' + alignment + ', dontBreakRows=' + dontBreakRows + ', rows=' + firstCount + '/' + secondCount, async function () {
						function definition(repeat) {
							var cell = { text: 'TARGET', verticalAlignment: alignment };
							var table = count => ({ table: {
								widths: ['*', '*'], dontBreakRows,
								body: [[cell, { text: Array.from({ length: count }, (_, i) => 'B' + i).join('\n') }]]
							} });
							return { pageSize: 'A6', content: [table(firstCount), { text: 'AFTER', pageBreak: 'after' }, ...(repeat ? [table(secondCount)] : [])] };
						}
						function firstArea(repeat) {
							var pages = new IntegrationTestHelper().renderPages('A6', definition(repeat));
							return pages.flatMap(page => page.items).find(item => item.type === 'beginVerticalAlignment').item.getViewHeight();
						}
						assert.equal(firstArea(true), firstArea(false));
						var single = (await renderedTexts(definition(false))).find(item => item.text === 'TARGET');
						var repeated = (await renderedTexts(definition(true))).find(item => item.text === 'TARGET');
						assert.ok(single);
						assert.deepEqual(repeated, single);
					});
				});
			});
		});

		it('preserves the first rowspan alignment when the same table is used again, alignment=' + alignment, async function () {
			function definition(repeat) {
				var joined = (count, prefix) => Array.from({ length: count }, (_, i) => prefix + i).join('\n');
				var table = {
					table: {
						widths: ['*', '*'], heights: 45,
						body: [
							[{ text: 'T0\nT1', rowSpan: 3, verticalAlignment: alignment }, { text: joined(20, 'B0-') }],
							[{}, { text: joined(20, 'B1-') }],
							[{}, { text: joined(20, 'B2-') }]
						]
					}
				};
				return {
					pageSize: 'A6',
					content: [{ text: joined(20, 'PRE') }, table, { text: 'AFTER', pageBreak: 'after' }, ...(repeat ? [table] : [])]
				};
			}
			function firstArea(repeat) {
				var pages = new IntegrationTestHelper().renderPages('A6', definition(repeat));
				return pages.flatMap(page => page.items).find(item => item.type === 'beginVerticalAlignment').item.getViewHeight();
			}
			assert.equal(firstArea(true), firstArea(false));
			var targetTexts = texts => texts.filter(item => /^T\d$/.test(item.text));
			var single = targetTexts(await renderedTexts(definition(false)));
			var repeated = targetTexts(await renderedTexts(definition(true)));
			assert.equal(single.length, 2);
			assert.deepEqual(repeated, single);
			assert.ok(repeated.every(item => item.page === 1 && item.y >= 40 && item.y + 14.0625 <= 379.53));
		});
	});

	[false, true].forEach(dontBreakRows => {
		[false, true].forEach(unbreakable => {
			['text', 'stack'].forEach(type => {
				[3, 9].forEach(bottomMargin => {
					['top', 'middle', 'bottom'].forEach(alignment => {
						it('preserves content height when its bottom margin crosses a page, dontBreakRows=' + dontBreakRows + ', unbreakable=' + unbreakable + ', type=' + type + ', margin=' + bottomMargin + ', alignment=' + alignment, async function () {
							function definition(value) {
								var lines = Array.from({ length: 23 }, (_, i) => ({ text: 'T' + i }));
								var cell = { margin: [0, 7, 0, bottomMargin], verticalAlignment: value, unbreakable };
								if (type === 'text') cell.text = lines.map(node => node.text).join('\n');
								else cell.stack = lines;
								return { pageSize: 'A6', content: [{ table: { widths: ['*', '*'], dontBreakRows, body: [[cell, 'B']] } }] };
							}
							var pages = new IntegrationTestHelper().renderPages('A6', definition(alignment));
							var begin = pages.flatMap(page => page.items).find(item => item.type === 'beginVerticalAlignment').item;
							assert.equal(begin.getNodeHeight(), 23 * 14.0625 + 7 + bottomMargin);
							var rendered = await renderedTexts(definition(alignment));
							assert.deepEqual(rendered, await renderedTexts(definition('top')));
							var content = rendered.filter(item => /^T\d+$/.test(item.text));
							assert.equal(content.length, 23);
							assert.ok(content.every(item => item.page === 1 && item.y >= 40 && item.y + 14.0625 <= 379.53));
						});
					});
				});
			});
		});
	});

	['middle', 'bottom'].forEach(alignment => {
		it('preserves empty and zero height content alignment, alignment=' + alignment, async function () {
			function definition(cell) {
				cell = JSON.parse(JSON.stringify(cell));
				return { pageSize: 'A6', content: [{ table: { body: [[{ ...cell, verticalAlignment: alignment }, { text: 'B\nB\nB' }]] } }] };
			}
			for (var cell of [{ text: '' }, { stack: [] }, { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 20, y2: 0, lineColor: 'red' }] }]) {
				var pages = new IntegrationTestHelper().renderPages('A6', definition(cell));
				var begin = pages[0].items.find(item => item.type === 'beginVerticalAlignment').item;
				assert.equal(begin.getNodeHeight(), 0);
				var linePositions = [];
				var rendered = await renderedTexts(definition(cell), function (vector) {
					if (vector.type === 'line' && vector.lineColor === 'red') {
						linePositions.push(vector.y1 + this.pdfDocument.page.height - this.pdfDocument._ctm[5]);
					}
				});
				if (cell.canvas) {
					var texts = rendered.filter(item => item.text === 'B');
					var bottom = texts[texts.length - 1].y + 14.0625;
					assert.deepEqual(linePositions, [alignment === 'middle' ? (texts[0].y + bottom) / 2 : bottom]);
				}
			}
		});
	});

	[false, true].forEach(dontBreakRows => {
		[0, 10].forEach(preceding => {
			[false, true].forEach(padding => {
				['top', 'middle', 'bottom'].forEach(alignment => {
					it('aligns a single page rowspan within its actual cell, dontBreakRows=' + dontBreakRows + ', preceding=' + preceding + ', padding=' + padding + ', alignment=' + alignment, async function () {
						var table = { table: { widths: ['*', '*'], dontBreakRows, body: [
							[{ text: 'SHORT', rowSpan: 2, verticalAlignment: alignment }, { text: 'B\n'.repeat(4) + 'B' }],
							[{}, { text: 'C\n'.repeat(6) + 'C' }]
						] } };
						if (padding) {
							table.layout = { paddingTop: row => 2 + row % 2, paddingBottom: row => 2 + row % 3, hLineWidth: () => 0.5 };
						}
						var rendered = await renderedTexts({ pageSize: 'A6', pageMargins: 20, content: Array.from({ length: preceding }, () => 'PRE').concat([table]) });
						var first = rendered.find(item => item.text === 'B');
						var last = rendered.filter(item => item.text === 'C').pop();
						// Breakable rows exclude the lower half-border from the alignment area.
						var bottom = last.y - (dontBreakRows ? 0 : padding ? 0.25 : 0.5);
						var expected = alignment === 'top' ? first.y : alignment === 'middle' ? (first.y + bottom) / 2 : bottom;
						assert.deepEqual(rendered.filter(item => item.text === 'SHORT'), [{ text: 'SHORT', page: 1, y: expected }]);
						assert.ok(rendered.every(item => item.page === 1));
					});
				});
			});
		});

		[23, 24].forEach(count => {
			['middle', 'bottom'].forEach(alignment => {
				it('aligns only when all content fits in the first page area, lines=' + count + ', dontBreakRows=' + dontBreakRows + ', alignment=' + alignment, async function () {
					function definition(value) {
						var result = document(60, dontBreakRows, value, true);
						result.content[0].table.body[0][0].text = Array.from({ length: count }, (_, i) => 'CONTENT' + i).join('\n');
						return result;
					}
					var top = await renderedTexts(definition('top'));
					var aligned = await renderedTexts(definition(alignment));
					var offset = count === 23 ? 0.5 / (alignment === 'middle' ? 2 : 1) : 0;
					assert.deepEqual(aligned, top.map(item => /^CONTENT\d+$/.test(item.text) ? { ...item, y: item.y + offset } : item));
				});
			});
		});

		[false, true].forEach(rowSpan => {
			[24, 60].forEach(count => {
				['top', 'middle', 'bottom'].forEach(alignment => {
					it('aligns short content on the first page, rows=' + count + ', rowspan=' + rowSpan + ', dontBreakRows=' + dontBreakRows + ', alignment=' + alignment, async function () {
						var pages = new IntegrationTestHelper().renderPages('A6', document(count, dontBreakRows, alignment, rowSpan));
						var begin = pages[0].items.find(item => item.type === 'beginVerticalAlignment').item;
						assert.equal(begin.getViewHeight(), 323.9375);
						var rendered = await renderedTexts(document(count, dontBreakRows, alignment, rowSpan));
						var short = rendered.filter(item => item.text === 'SHORT');
						assert.equal(short.length, 1);
						assert.equal(short[0].page, 1);
						assert.equal(short[0].y, alignment === 'top' ? 43 : alignment === 'middle' ? 197.9375 : 352.875);
						assert.deepEqual(rendered.filter(item => /^L\d+$/.test(item.text)).map(item => item.text), Array.from({ length: count }, (_, i) => 'L' + i));
					});
				});
			});
		});
	});

	[false, true].forEach(unbreakable => {
		['top', 'middle', 'bottom'].forEach(alignment => {
			it('keeps page decorations unchanged when the cell content moves to the next page, unbreakable=' + unbreakable + ', alignment=' + alignment, async function () {
				var content = Array.from({ length: 23 }, () => ({ text: 'PRE' })).concat([
					{ table: { widths: ['*', '*'], body: [[{ text: 'SHORT', verticalAlignment: alignment }, { text: 'L\n'.repeat(9) + 'L' }]] } },
					{ text: 'AFTER' }
				]);
				var rendered = await renderedTexts({
					pageSize: 'A6',
					header: () => ({ text: 'HEADER' }),
					footer: () => ({ text: 'FOOTER' }),
					content: unbreakable ? [{ unbreakable: true, stack: content }] : content
				});
				assert.deepEqual(rendered.filter(item => item.text === 'HEADER').map(item => item.y), [0, 0]);
				assert.deepEqual(rendered.filter(item => item.text === 'FOOTER').map(item => item.y), [379.53, 379.53]);
				assert.deepEqual(rendered.filter(item => item.text === 'SHORT'), [{ text: 'SHORT', page: 2, y: 43 }]);
			});
		});
	});

	['plain', 'nested', 'unbreakable', 'header', 'callback'].forEach(context => {
		[10, 15, 20].forEach(count => {
			['top', 'middle', 'bottom'].forEach(alignment => {
				it('aligns a rowspan on its first page when whole rows move to later pages, context=' + context + ', lines=' + count + ', alignment=' + alignment, async function () {
					var body = Array.from({ length: 3 }, (_, row) => [
						row === 0 ? { text: 'SHORT', rowSpan: 3, verticalAlignment: alignment } : {},
						{ text: Array.from({ length: count }, (_, i) => 'R' + row + 'L' + i).join('\n') }
					]);
					var table = { table: { widths: ['*', '*'], dontBreakRows: true, body } };
					if (context === 'header') {
						table.table.headerRows = 1;
						body.unshift(['HEADER', 'HEADER']);
					} else if (context === 'nested') {
						table = { table: { widths: ['*'], body: [[table]] } };
					} else if (context === 'unbreakable') {
						table = { unbreakable: true, stack: [table] };
					}
					var definition = { pageSize: 'A6', content: [table, 'AFTER'] };
					if (context === 'callback') {
						table.id = 'ROWSPAN';
						definition.content.unshift({ text: 'BEFORE' });
						definition.pageBreakBefore = node => node.id === 'ROWSPAN';
					}
					var rendered = await renderedTexts(definition);
					var siblings = rendered.filter(item => /^R\d+L\d+$/.test(item.text));
					var firstPage = siblings.filter(item => item.page === siblings[0].page);
					var top = firstPage[0].y;
					var bottom = firstPage[firstPage.length - 1].y;
					var expected = alignment === 'top' ? top : alignment === 'middle' ? (top + bottom) / 2 : bottom;
					assert.deepEqual(rendered.filter(item => item.text === 'SHORT'), [{ text: 'SHORT', page: siblings[0].page, y: expected }]);
					assert.equal(siblings.length, 3 * count);
					assert.equal(rendered.filter(item => item.text === 'AFTER').length, 1);
				});
			});
		});
	});

	['middle', 'bottom'].forEach(alignment => {
		it('recomputes the first page area after pageBreakBefore repeats layout, alignment=' + alignment, async function () {
			function definition(callback) {
				var result = document(60, false, alignment, true);
				var table = result.content[0];
				table.id = 'table';
				if (callback) {
					result.pageBreakBefore = node => node.id === 'table';
				} else {
					table.pageBreak = 'before';
				}
				result.content.unshift({ text: 'BEFORE\n'.repeat(9) + 'BEFORE' });
				return result;
			}
			assert.deepEqual(await renderedTexts(definition(true)), await renderedTexts(definition(false)));
		});

		it('keeps the first page alignment area when a rowspan ends on a later page, alignment=' + alignment, async function () {
			async function render(rowCount) {
				var body = Array.from({ length: rowCount }, (_, row) => [
					row === 0 ? { text: 'SHORT', rowSpan: rowCount, verticalAlignment: alignment } : {},
					{ text: Array.from({ length: 30 }, (_, i) => 'R' + row + 'L' + i).join('\n') }
				]);
				return renderedTexts({ pageSize: 'A6', content: [{ table: { widths: ['*', '*'], body } }] });
			}
			var first = (await render(2)).filter(item => item.text === 'SHORT');
			assert.deepEqual((await render(4)).filter(item => item.text === 'SHORT'), first);
			assert.equal(first.length, 1);
			assert.equal(first[0].page, 1);
			assert.ok(first[0].y > 43 && first[0].y < 366.9375);
		});

		it('uses only the remaining first page area when the table follows other content, alignment=' + alignment, async function () {
			function definition(value) {
				var result = document(60, false, value, true);
				result.content.unshift({ text: 'BEFORE\n'.repeat(9) + 'BEFORE' });
				return result;
			}
			var top = (await renderedTexts(definition('top'))).find(item => item.text === 'SHORT');
			var aligned = (await renderedTexts(definition(alignment))).find(item => item.text === 'SHORT');
			assert.equal(aligned.page, 1);
			assert.ok(aligned.y > top.y);
			assert.equal(aligned.y, top.y + (366.9375 - top.y - 14.0625) / (alignment === 'middle' ? 2 : 1));
		});

		it('leaves multipage cell content at the same positions as top alignment, alignment=' + alignment, async function () {
			function definition(value) {
				var result = document(60, false, value, false);
				result.content[0].table.body[0][0] = { text: Array.from({ length: 60 }, (_, i) => 'CONTENT' + i).join('\n'), verticalAlignment: value };
				return result;
			}
			assert.deepEqual(await renderedTexts(definition(alignment)), await renderedTexts(definition('top')));
		});
	});
});
