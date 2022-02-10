'use strict';

var assert = require('assert');

var ElementWriter = require('../src/elementWriter');

describe('ElementWriter', function () {
	var ew, ctx, page, tracker, fakePosition;

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
		tracker = { emit: function () { } };
		ew = new ElementWriter(ctx, tracker);

	});

	function buildLine(height, alignment, x, y) {
		return {
			getHeight: function () {
				return height;
			},
			getWidth: function () {
				return 60;
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

		it('should return position on page', function () {
			var line = buildLine(20);

			ew.pushContext(50, 50);
			ew.pushContext(20, 30);
			ew.pushContext(11, 40);
			var position = ew.addLine(line);

			assert.equal(position, fakePosition);
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
	});
});
