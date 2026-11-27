'use strict';

var assert = require('assert');
var sinon = require('sinon');
var LayoutBuilder = require('../../js/LayoutBuilder').default;

var integrationTestHelper = require('./integrationTestHelper');

describe('Integration test: background', function () {

	var testHelper = new integrationTestHelper();

	[0, 20, 60, 'table'].forEach(backgroundSize => {
		[false, true].forEach(dontBreakRows => {
			['plain', 'snaking', 'nested'].forEach(context => {
				[false, true].forEach(relayout => {
					it(`keeps table headers independent of background pages, background=${backgroundSize}, dontBreakRows=${dontBreakRows}, context=${context}, relayout=${relayout}`, function () {
						function background() {
							if (backgroundSize === 'table') {
								return { table: { headerRows: 1, body: [['BG_HEADER']].concat(
									Array.from({ length: 45 }, (_, index) => ['BG_' + index])
								) } };
							}
							return backgroundSize ? { text: Array.from({ length: backgroundSize }, (_, index) => 'BG_' + index).join('\n') } : null;
						}
						function document(withBackground) {
							var table = { table: { headerRows: 1, dontBreakRows, body: [
								['HEADER'],
								[{ text: Array.from({ length: 60 }, (_, index) => 'row' + index).join('\n') }],
								['END']
							] } };
							var nodes = (relayout ? [{ text: 'RETRY' }] : []).concat([table]);
							var content = context === 'snaking'
								? [{ snakingColumns: true, columnGap: 10, columns: [{ stack: nodes }, { text: '' }] }]
								: context === 'nested' ? [{ table: { body: [[{ stack: nodes }, 'SIBLING']] } }] : nodes;
							return { background: withBackground ? background : undefined, content,
								pageBreakBefore: relayout ? node => node.text === 'RETRY' : undefined };
						}
						function lines(pages) {
							return pages.map(page => page.items.filter(entry => entry.type === 'line').map(entry => ({
								text: entry.item.inlines.map(inline => inline.text).join(''), x: entry.item.x, y: entry.item.y
							})).filter(line => !line.text.startsWith('BG_')));
						}
						var expected = lines(testHelper.renderPages('A6', document(false)));
						var pages = testHelper.renderPages('A6', document(true));
						var actual = lines(pages);

						assert.deepStrictEqual(actual, expected);
						assert.deepStrictEqual(actual.flat().filter(line => /^row\d+$/.test(line.text)).map(line => line.text),
							Array.from({ length: 60 }, (_, index) => 'row' + index));
						assert.equal(actual.flat().filter(line => line.text === 'END').length, 1);
						if (backgroundSize === 'table') {
							pages.forEach(page => assert.equal(page.items.filter(entry => entry.type === 'line' && entry.item.inlines.map(inline => inline.text).join('') === 'BG_HEADER').length, 1));
						}
					});
				});
			});
		});
	});

	['left', 'center', 'right'].forEach(function (alignment) {
		['static', 'shared-function', 'fresh-function'].forEach(function (mode) {
			[false, true].forEach(function (relayout) {
				it('keeps canvas coordinates stable for ' + mode + ', alignment=' + alignment + ', relayout=' + relayout, function () {
					function makeBackground() {
						return {
							alignment: alignment,
							absolutePosition: { x: 70, y: 80 },
							canvas: [
								{ type: 'rect', x: 3, y: 4, w: 20, h: 15, color: 'red' },
								{ type: 'line', x1: 3, y1: 4, x2: 23, y2: 19, lineColor: 'blue' },
								{ type: 'ellipse', x: 8, y: 9, r1: 5, r2: 4, color: 'green' },
								{ type: 'polyline', points: [{ x: 3, y: 4 }, { x: 23, y: 19 }], lineColor: 'orange' }
							]
						};
					}
					function render(background) {
						return testHelper.renderPages('A6', {
							background: background,
							content: [{ text: 'P1' }, { text: 'MOVE' }, { text: 'P2', pageBreak: 'before' }, { text: 'P3', pageBreak: 'before' }],
							pageBreakBefore: relayout ? node => node.text === 'MOVE' && node.startPosition.pageNumber === 1 : undefined
						}).map(page => page.items.filter(item => item.type === 'vector').map(entry => {
							var item = entry.item;
							return { type: item.type, x: item.x, y: item.y, x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2, points: item.points };
						}));
					}
					var shared = makeBackground();
					var background = mode === 'static' ? shared : mode === 'shared-function' ? () => shared : makeBackground;
					var actual = render(background);
					assert.equal(actual.length, relayout ? 4 : 3);
					assert.deepStrictEqual(actual, render(makeBackground));
					actual.forEach(page => assert.deepStrictEqual(page, actual[0]));
					assert.equal(shared.canvas[0].x, 3);
					assert.equal(shared.canvas[0].y, 4);
					assert.deepStrictEqual(shared.canvas[3].points, [{ x: 3, y: 4 }, { x: 23, y: 19 }]);
					if (alignment === 'left') {
						assert.equal(actual[0][0].x, 73);
						assert.equal(actual[0][0].y, 84);
					}
				});
			});
		});
	});

	it('resets static background coordinates when a content page break repeats layout', function () {
		function background() {
			return { margin: [20, 30, 0, 0], stack: [
				{ canvas: [{ type: 'rect', x: 2, y: 3, w: 10, h: 10 }] },
				{ table: { body: [['DECOR']] } }
			] };
		}
		function render(requestBreak) {
			const decor = background();
			return testHelper.renderPages('A6', {
				background: page => page === 1 ? decor : null,
				content: ['FIRST', { text: 'SECOND', pageBreak: requestBreak ? undefined : 'before' }],
				pageBreakBefore: requestBreak ? node => node.text === 'SECOND' : undefined
			});
		}
		function items(page) {
			return page.items.map(({ type, item }) => type === 'line'
				? { type, text: item.inlines.map(inline => inline.text).join(''), x: item.x, y: item.y }
				: { type, x: item.x, y: item.y, x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2 });
		}
		assert.deepStrictEqual(render(true).map(items), render(false).map(items));
	});

	[false, true].forEach(dynamic => {
		['observe', 'pageBreak', 'fallback'].forEach(mode => {
			it(`excludes a ${dynamic ? 'dynamic' : 'static'} background from page break decisions during ${mode}`, function () {
				function background() {
					return { id: 'decor-stack', stack: [
						{ id: 'decor-text', text: 'DECOR' },
						{ id: 'decor-canvas', absolutePosition: { x: 0, y: 0 }, canvas: [{ type: 'rect', x: 2, y: 3, w: 10, h: 10 }] },
						{ id: 'decor-table', absolutePosition: { x: 0, y: 0 }, table: { body: [[{ id: 'decor-cell', text: 'CELL' }]] } }
					] };
				}

				function content(expected) {
					return [
						{ text: 'FIRST' },
						{ id: 'second', text: 'SECOND', pageBreak: expected && mode === 'pageBreak' ? 'before' : undefined },
						{ unbreakable: mode === 'fallback', stack: Array.from({ length: 60 }, (_, index) => ({ text: 'row-' + index })) }
					];
				}

				function items(pages) {
					return pages.map(page => page.items.map(({ type, item }) => type === 'line'
						? { type, text: item.inlines.map(inline => inline.text).join(''), x: item.x, y: item.y }
						: { type, vectorType: item.type, x: item.x, y: item.y, x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2, w: item.w, h: item.h }));
				}

				const expected = testHelper.renderPages('A6', { background: dynamic ? background : background(), content: content(true) });
				const seen = [];
				const original = LayoutBuilder.prototype.tryLayoutDocument;
				let passes = 0;
				const stub = sinon.stub(LayoutBuilder.prototype, 'tryLayoutDocument').callsFake(function (...args) {
					assert.ok(++passes <= 6, 'Layout must terminate');
					return original.apply(this, args);
				});
				try {
					const actual = testHelper.renderPages('A6', {
						background: dynamic ? background : background(),
						content: content(false),
						pageBreakBefore(node, context) {
							const nodes = [node, ...context.getPreviousNodesOnPage(), ...context.getFollowingNodesOnPage(), ...context.getNodesOnNextPage()];
							assert.ok(nodes.every(item => !item.id || !item.id.startsWith('decor-')), 'Background must be absent from callbacks and context');
							seen.push(node);
							return node.text === 'DECOR' || (mode === 'pageBreak' && node.id === 'second');
						}
					});
					assert.ok(seen.some(node => node.text === 'FIRST'));
					assert.equal(passes, mode === 'observe' ? 1 : 2);
					assert.deepStrictEqual(items(actual), items(expected));
				} finally {
					stub.restore();
				}
			});
		});
	});

	it('ignores page breaks in a temporary background context when laying out table rows', function () {
		function content() {
			return { table: { widths: ['*'], body: Array.from({ length: 40 }, (_, index) => [{ text: 'row-' + index }]) } };
		}

		function tableItems(page) {
			return page.items.filter(entry => entry.type === 'vector' || (entry.type === 'line' && entry.item.inlines[0].text.startsWith('row-'))).map(entry => {
				var item = entry.item;
				return entry.type === 'line'
					? { text: item.inlines.map(inline => inline.text).join(''), x: item.x, y: item.y }
					: { type: item.type, x1: item.x1, y1: item.y1, x2: item.x2, y2: item.y2, lineWidth: item.lineWidth };
			});
		}

		var expected = testHelper.renderPages('A6', { content: content() });
		var actual = testHelper.renderPages('A6', {
			background: () => ({ stack: Array.from({ length: 50 }, (_, index) => ({ text: 'background-' + index })) }),
			content: content()
		});

		assert.equal(actual.length, expected.length);
		actual.forEach((page, index) => assert.deepStrictEqual(tableItems(page), tableItems(expected[index])));
	});

	['ul', 'ol'].forEach(listType => {
		['text', 'ul', 'ol'].forEach(backgroundType => {
			it(`keeps ${listType} markers aligned across pages with a ${backgroundType} background`, function () {
				function background() {
					return backgroundType === 'text'
						? { text: 'Background', margin: [20, 20, 20, 20] }
						: { [backgroundType]: ['Background 1', 'Background 2'], margin: [20, 20, 20, 20] };
				}

				function content() {
					return { [listType]: Array.from({ length: 50 }, () => 'hello world') };
				}

				function items(page) {
					return page.items.map(({ type, item }) => ({
						type,
						text: item.inlines && item.inlines.map(inline => inline.text).join(''),
						x: item.x,
						y: item.y
					}));
				}

				const expectedPages = testHelper.renderPages('A6', { content: content() });
				const backgroundPage = testHelper.renderPages('A6', { content: 'Plain text', background })[0];
				const expectedBackground = items(backgroundPage).slice(0, -1);
				const pages = testHelper.renderPages('A6', { content: content(), background });

				assert.ok(pages.length >= 3);
				assert.equal(pages.length, expectedPages.length);
				pages.forEach((page, index) => {
					assert.deepStrictEqual(items(page), expectedBackground.concat(items(expectedPages[index])));
				});
			});
		});
	});

	it('renders on every page', function () {
		var dd = {
			background: function (page) {
				return [
					'Background paragraph on page ' + page
				];
			},
			content: [
				'First page',
				'\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n',
				'Another Page'
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 2);

		var backgroundPage1 = pages[0].items[0].item;
		assert.equal(backgroundPage1.inlines.map(node => node.text).join(''), 'Background paragraph on page 1');
		assert.equal(backgroundPage1.x, 0);
		assert.equal(backgroundPage1.y, 0);

		var backgroundPage2 = pages[1].items[0].item;
		assert.equal(backgroundPage2.inlines.map(node => node.text).join(''), 'Background paragraph on page 2');
		assert.equal(backgroundPage2.x, 0);
		assert.equal(backgroundPage2.y, 0);
	});

	it('table fillColor must be above background', function () {
		var dd = {
			background: function () {
				return [
					'Background paragraph'
				];
			},
			content: [
				{
					table: {
						body: [
							[
								{
									text: '\n',
									fillColor: '#7d02c9'
								}
							]
						]
					}
				}
			]
		};

		var pages = testHelper.renderPages('A6', dd);

		assert.equal(pages.length, 1);

		var fillColorRect = pages[0].items[1].item;
		var backgroundPage = pages[0].items[0].item;

		assert.equal(backgroundPage.inlines.map(node => node.text).join(''), 'Background paragraph');
		assert.equal(fillColorRect.type, 'rect');
		assert.equal(fillColorRect.color, '#7d02c9');
	});

	/**
	 * This should test any case in which function addPageItem is called with
	 * defined index. This includes but might not be limited to:
	 * - Vectors
	 * - Qr
	 * - Lists
	 * - Tables
	 * - Images
	 * - Leafs
	 */
	it('background elements remain at the bottom of item list on every page', function () {
		var dd = {
			background: function () {
				return [
					{
						canvas: [
							{
								type: 'rect',
								x: 0,
								y: 0,
								w: 50,
								h: 50,
								color: 'red'
							},
							{
								type: 'rect',
								x: 0,
								y: 0,
								w: 50,
								h: 50,
								color: 'green'
							},
							{
								type: 'rect',
								x: 0,
								y: 0,
								w: 50,
								h: 50,
								color: 'blue'
							}
						]
					}
				];
			},
			content: [
				{
					table: {
						body: [
							[
								{
									text: 'a',
									fillColor: '#aaa'
								},
								{
									text: 'b',
									fillColor: '#bbb'
								},
								{
									text: 'c',
									fillColor: '#ccc'
								}
							]
						]
					}
				},
				{
					qr: 'qr',
					foreground: 'red',
					background: 'yellow'
				},
				{
					ul: [
						'List 1',
						'List 2',
						'List 3'
					]
				},
				{
					image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
				},
				{
					text: 'Leaf',
					pageBreak: 'after'
				},
				{
					table: {
						body: [
							[
								{
									text: 'a',
									fillColor: '#aaa'
								},
								{
									text: 'b',
									fillColor: '#bbb'
								},
								{
									text: 'c',
									fillColor: '#ccc'
								}
							]
						]
					}
				}
			]
		};
		var pages = testHelper.renderPages('A6', dd);
		assert.equal(pages.length, 2);
		var first = pages[0].items[0].item;
		var second = pages[0].items[1].item;
		var third = pages[0].items[2].item;
		var first2 = pages[1].items[0].item;
		var second2 = pages[1].items[1].item;
		var third2 = pages[1].items[2].item;
		assert.equal(first.color, 'red');
		assert.equal(second.color, 'green');
		assert.equal(third.color, 'blue');
		assert.equal(first2.color, 'red');
		assert.equal(second2.color, 'green');
		assert.equal(third2.color, 'blue');
	});

});
