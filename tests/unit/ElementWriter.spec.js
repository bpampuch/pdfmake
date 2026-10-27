'use strict';

var assert = require('assert');

var ElementWriter = require('../../js/ElementWriter').default;
var DocumentContext = require('../../js/DocumentContext').default;

describe('ElementWriter', function () {
	var ew, ctx, page, fakePosition;

	beforeEach(function () {
		fakePosition = { fake: 'position' };
		page = { items: [] };
		ctx = {
			x: 10,
			y: 20,
			availableWidth: 100,
			availableHeight: 100,
			getCurrentPage: function () {
				return page;
			},
			getCurrentPosition: function () {
				return fakePosition;
			},
			moveDown: function (offset) {
				ctx.y += offset;
				ctx.availableHeight -= offset;
			}
		};
		ew = new ElementWriter(ctx);

	});

	function buildLine(height, alignment, x, y) {
		return {
			getHeight: function () {
				return height;
			},
			getWidth: function () {
				return 60;
			},
			clone: function () {
				let result = {};

				for (let key in this) {
					if (this.hasOwnProperty(key)) {
						result[key] = this[key];
					}
				}

				return result;
			},
			inlines: [
				{
					alignment: alignment,
					x: 0,
				},
				{
					x: 30,
				},
				{
					x: 50
				}
			],
			x: x,
			y: y
		};
	}

	describe('addLine', function () {
		it('should add lines to the current page if there\'s enough space', function () {
			var line = buildLine(20);

			var position = ew.addLine(line);

			assert.equal(page.items.length, 1);
			assert.equal(position, fakePosition);
		});

		it('should resolve positions through nested fragments when they are committed', function () {
			var context = new DocumentContext();
			context.addPage({ width: 200, height: 300, orientation: 'portrait' }, { left: 10, right: 10, top: 10, bottom: 10 });
			context.moveDown(10);
			var writer = new ElementWriter(context);
			writer.pushContext(80, 100);
			writer.pushContext(40, 60);
			writer.context().moveDown(5);
			var position = writer.addLine(buildLine(20));
			assert.equal(position.left, 0);
			assert.equal(position.top, 5);

			var innerFragment = writer.context().getCurrentPage();
			innerFragment.height = 25;
			writer.popContext();
			writer.context().x = 7;
			writer.context().moveDown(11);
			writer.addFragment(innerFragment);
			assert.equal(position.left, 7);
			assert.equal(position.top, 16);

			var outerFragment = writer.context().getCurrentPage();
			outerFragment.height = 36;
			writer.popContext();
			writer.addFragment(outerFragment);
			assert.deepEqual(position, {
				pageNumber: 1, pageOrientation: 'portrait', pageInnerHeight: 280, pageInnerWidth: 180,
				left: 17, top: 36, horizontalRatio: 7 / 180, verticalRatio: 26 / 280
			});
			assert.equal(context.getCurrentPage().items[0].item.x, position.left);
			assert.equal(context.getCurrentPage().items[0].item.y, position.top);
		});

		it('should not add line and return false if there\'s not enough space', function () {
			var line = buildLine(120);

			assert(!ew.addLine(line));
			assert.equal(page.items.length, 0);
		});

		it('should set line.x and line.y to current context\'s values', function () {
			var line = buildLine(30);

			ew.addLine(line);
			assert.equal(line.x, 10);
			assert.equal(line.y, 20);
		});

		it('should update context.y and context.availableHeight', function () {
			ew.addLine(buildLine(30));
			assert.equal(ctx.y, 20 + 30);
			assert.equal(ctx.availableHeight, 100 - 30);
		});

		describe('should support line alignment', function () {
			it('right', function () {
				var line = buildLine(30, 'right');
				ew.addLine(line);
				assert.equal(line.x, 10 + 100 - line.getWidth());
			});

			it('center', function () {
				var line = buildLine(30, 'center');
				ew.addLine(line);
				assert.equal(line.x, 10 + (100 - line.getWidth()) / 2);
			});

			it('justify', function () {
				var line = buildLine(30, 'justify');
				ew.addLine(line);
				assert.equal(line.x, 10);

				var additionalSpacing = (100 - 60) / 2;

				assert.equal(line.inlines[1].x, 30 + additionalSpacing);
				assert.equal(line.inlines[2].x, 50 + 2 * additionalSpacing);
			});

			it('should keep connected fragments together after a justified gap', function () {
				var line = buildLine(30, 'justify');
				line.inlines[1].noNewLine = true;

				ew.addLine(line);

				assert.equal(line.inlines[1].x, 70);
				assert.equal(line.inlines[1].justifyShift, 40);
				assert.equal(line.inlines[2].x, 90);
				assert.equal(line.inlines[2].justifyShift, 0);
			});

			it('should leave a line without justifiable gaps unchanged', function () {
				var line = buildLine(30, 'justify');
				line.inlines[0].noNewLine = true;
				line.inlines[1].noNewLine = true;

				ew.addLine(line);

				assert.deepEqual(line.inlines.map(inline => inline.x), [0, 30, 50]);
				assert.equal(line.inlines[1].justifyShift, 0);
				assert.equal(line.inlines[2].justifyShift, 0);
			});

			it('should preserve connected fragments for every combination of gaps', function () {
				for (var mask = 0; mask < 64; mask++) {
					var line = buildLine(30, 'justify');
					line.inlines = Array.from({ length: 6 }, (_, i) => ({
						alignment: 'justify', x: i * 10, width: 10, noNewLine: Boolean(mask & (1 << i))
					}));
					ew.alignLine(line);

					var gaps = [];
					for (var i = 1; i < line.inlines.length; i++) {
						var previous = line.inlines[i - 1];
						var gap = line.inlines[i].x - previous.x - previous.width;
						assert(Number.isFinite(line.inlines[i].x));
						if (previous.noNewLine) {
							assert(Math.abs(gap) < 1e-8);
							assert.equal(line.inlines[i].justifyShift, 0);
						} else {
							gaps.push(gap);
						}
					}
					gaps.forEach(gap => assert(Math.abs(gap - gaps[0]) < 1e-8));
					var end = line.inlines[5].x + line.inlines[5].width;
					assert(Math.abs(end - (gaps.length ? 100 : 60)) < 1e-8);
				}
			});

			['newLineForced', 'lastLineInParagraph'].forEach(function (flag) {
				it('should not justify a line marked ' + flag, function () {
					var line = buildLine(30, 'justify');
					line[flag] = true;
					line.inlines[0].noNewLine = true;
					ew.alignLine(line);
					assert.deepEqual(line.inlines.map(inline => inline.x), [0, 30, 50]);
					line.inlines.forEach(inline => assert.equal(inline.justifyShift, undefined));
				});
			});
		});
	});

	describe('addVector', function () {
		it('should add vectors to the current page', function () {
			ew.addVector({ type: 'rect', x: 10, y: 10 });
			assert.equal(page.items.length, 1);
		});

		it('should offset vectors to the current position', function () {
			var rect = { type: 'rect', x: 10, y: 10 };
			var ellipse = { type: 'ellipse', x: 10, y: 10 };
			var line = { type: 'line', x1: 10, x2: 50, y1: 10, y2: 20 };
			var polyline = { type: 'polyline', points: [{ x: 0, y: 0 }, { x: 20, y: 20 }] };

			ew.addVector(rect);
			ew.addVector(ellipse);
			ew.addVector(line);
			ew.addVector(polyline);

			assert.equal(rect.x, 20);
			assert.equal(rect.y, 30);

			assert.equal(ellipse.x, 20);
			assert.equal(ellipse.y, 30);

			assert.equal(line.x1, 20);
			assert.equal(line.x2, 60);
			assert.equal(line.y1, 30);
			assert.equal(line.y2, 40);

			assert.equal(polyline.points[0].x, 10);
			assert.equal(polyline.points[0].y, 20);
			assert.equal(polyline.points[1].x, 30);
			assert.equal(polyline.points[1].y, 40);
		});
	});

	describe('addFragment', function () {
		it('should copy polyline points independently for each fragment insertion', function () {
			var vector = { type: 'polyline', points: [{ x: 2, y: 3 }, { x: 22, y: 13 }], closePath: true };
			var fragment = { height: 20, items: [{ type: 'vector', item: vector }] };

			ew.addFragment(fragment);
			ctx.x = 40;
			ctx.y = 50;
			ew.addFragment(fragment);

			assert.deepStrictEqual(vector.points, [{ x: 2, y: 3 }, { x: 22, y: 13 }]);
			assert.deepStrictEqual(page.items[0].item.points, [{ x: 12, y: 23 }, { x: 32, y: 33 }]);
			assert.deepStrictEqual(page.items[1].item.points, [{ x: 42, y: 53 }, { x: 62, y: 63 }]);
			assert.equal(page.items[0].item.closePath, true);
		});

		var fragment;

		beforeEach(function () {
			fragment = {
				items: [
					{
						type: 'line',
						item: buildLine(30, 'left', 10, 10)
					},
					{
						type: 'line',
						item: buildLine(30, 'left', 10, 50)
					},
					{
						type: 'vector',
						item: { type: 'rect', x: 10, y: 20 }
					},
					{
						type: 'vector',
						item: { type: 'rect', x: 40, y: 60 }
					}
				]
			};
		});

		it('should add all fragment vectors and lines', function () {
			ew.addFragment(fragment);

			assert.equal(page.items.length, 4);
		});

		it('should return false if fragment height is larger than available space', function () {
			fragment.height = 120;

			assert(!ew.addFragment(fragment));
		});

		it('should update current position', function () {
			fragment.height = 50;
			ew.addFragment(fragment);

			assert.equal(ctx.y, 20 + 50);
		});

		it('should offset lines and vectors', function () {
			ew.addFragment(fragment);

			assert.equal(page.items[0].item.x, 20);
			assert.equal(page.items[0].item.y, 30);
			assert.equal(page.items[1].item.x, 20);
			assert.equal(page.items[1].item.y, 70);

			assert.equal(page.items[2].item.x, 20);
			assert.equal(page.items[2].item.y, 40);
			assert.equal(page.items[3].item.x, 50);
			assert.equal(page.items[3].item.y, 80);
		});

		it('should not modify original line/vector positions', function () {
			ew.addFragment(fragment);

			assert.equal(fragment.items[0].item.x, 10);
			assert.equal(fragment.items[0].item.y, 10);

			assert.equal(fragment.items[3].item.x, 40);
			assert.equal(fragment.items[3].item.y, 60);
		});

		it('should keep the draw order of fill colors from an unbreakable block', function () {
			ctx.page = 0;
			ctx.backgroundLength = [1];
			page.items = [{ type: 'vector', item: { type: 'rect', color: 'pageBackground' } }];

			fragment.items = [
				{ type: 'vector', item: { type: 'rect', color: 'firstFill', _isFillColorFromUnbreakable: true } },
				{ type: 'vector', item: { type: 'rect', color: 'secondFill', _isFillColorFromUnbreakable: true } },
				{ type: 'vector', item: { type: 'rect', color: 'thirdFill', _isFillColorFromUnbreakable: true } },
				{ type: 'vector', item: { type: 'rect', color: 'border' } }
			];

			ew.addFragment(fragment);

			assert.deepEqual(page.items.map(item => item.item.color), ['pageBackground', 'firstFill', 'secondFill', 'thirdFill', 'border']);
		});
	});
});
