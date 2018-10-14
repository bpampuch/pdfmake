var assert = require('assert');

var ElementWriter = require('../../js/ElementWriter').default;
var DocumentContext = require('../../js/DocumentContext').default;

describe('ElementWriter', function () {
	var elementWriter, context, page, fakePosition;

	const buildLine = function (height, alignment, x, y) {
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
	};

	beforeEach(function () {
		fakePosition = { fake: 'position' };
		page = { items: [] };
		context = {
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
				context.y += offset;
				context.availableHeight -= offset;
			}
		};
		elementWriter = new ElementWriter(context);
	});

	describe('addLine', function () {

		it('should add lines to the current page if there\'s enough space', function () {
			var line = buildLine(20);

			var position = elementWriter.addLine(line);

			assert.equal(page.items.length, 1);
			assert.equal(position, fakePosition);
		});


		it('should return position on page', function () {
			var line = buildLine(20);

			elementWriter.pushContext(50, 50);
			elementWriter.pushContext(20, 30);
			elementWriter.pushContext(11, 40);
			var position = elementWriter.addLine(line);

			assert.equal(position, fakePosition);
		});

		it('should not add line and return false if there\'s not enough space', function () {
			var line = buildLine(120);

			assert(!elementWriter.addLine(line));
			assert.equal(page.items.length, 0);
		});

		it('should set line.x and line.y to current context\'s values', function () {
			var line = buildLine(30);

			elementWriter.addLine(line);
			assert.equal(line.x, 10);
			assert.equal(line.y, 20);
		});

		it('should update context.y and context.availableHeight', function () {
			elementWriter.addLine(buildLine(30));
			assert.equal(context.y, 20 + 30);
			assert.equal(context.availableHeight, 100 - 30);
		});

		describe('should support line alignment', function () {
			it('right', function () {
				var line = buildLine(30, 'right');
				elementWriter.addLine(line);
				assert.equal(line.x, 10 + 100 - line.getWidth());
			});

			it('center', function () {
				var line = buildLine(30, 'center');
				elementWriter.addLine(line);
				assert.equal(line.x, 10 + (100 - line.getWidth()) / 2);
			});

			it('justify', function () {
				var line = buildLine(30, 'justify');
				elementWriter.addLine(line);
				assert.equal(line.x, 10);

				var additionalSpacing = (100 - 60) / 2;

				assert.equal(line.inlines[1].x, 30 + additionalSpacing);
				assert.equal(line.inlines[2].x, 50 + 2 * additionalSpacing);
			});
		});

	});

	// TODO

});
