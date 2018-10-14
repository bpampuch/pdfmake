var assert = require('assert');

var PageElementWriter = require('../../js/PageElementWriter').default;
var DocumentContext = require('../../js/DocumentContext').default;

describe('PageElementWriter', function () {
	var pageElementWriter, context, pageSize;

	var DOCUMENT_WIDTH = 600;
	var DOCUMENT_HEIGHT = 1100;
	var DOCUMENT_ORIENTATION = 'portrait';

	var MARGINS = {
		left: 40,
		right: 60,
		top: 30,
		bottom: 70
	};

	var AVAILABLE_HEIGHT = 1000;
	var AVAILABLE_WIDTH = 500;

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
					x: 0
				},
				{
					x: 30
				},
				{
					x: 50
				}
			],
			x: x,
			y: y
		};
	};

	const addOneTenthLines = function (count) {
		let lastPosition;
		for (let i = 0; i < count; i++) {
			let line = buildLine(AVAILABLE_HEIGHT / 10);
			lastPosition = pageElementWriter.addLine(line);
		}
		return lastPosition;
	};

	const createRepeatable = function (marker, height) {
		var rep = { items: [] };
		rep.height = height;

		var repLine = buildLine(height);
		repLine.marker = marker;

		rep.items.push({
			type: 'line',
			item: repLine
		});

		rep.insertedOnPages = [];

		return rep;
	}

	beforeEach(function () {
		pageSize = { width: DOCUMENT_WIDTH, height: DOCUMENT_HEIGHT, orientation: DOCUMENT_ORIENTATION };
		context = new DocumentContext(pageSize, MARGINS);
		pageElementWriter = new PageElementWriter(context);
	});

	describe('addLine', function () {

		it('should add new lines if there\'s enough space left', function () {
			var position = addOneTenthLines(10);

			assert.equal(context.pages.length, 1);
			assert.deepEqual(position, { pageNumber: 1, left: MARGINS.left, top: (9 / 10 * AVAILABLE_HEIGHT) + MARGINS.top, verticalRatio: 0.9, horizontalRatio: 0, pageOrientation: 'portrait', pageInnerHeight: 1000, pageInnerWidth: 500 });
		});

		it('should add new pages if there\'s not enough space left', function () {
			var position = addOneTenthLines(11);

			assert.equal(context.pages.length, 2);
			assert.equal(context.pages[0].items.length, 10);
			assert.equal(context.pages[1].items.length, 1);
			assert.deepEqual(position, { pageNumber: 2, left: MARGINS.left, top: MARGINS.top, verticalRatio: 0, horizontalRatio: 0, pageOrientation: 'portrait', pageInnerHeight: 1000, pageInnerWidth: 500 });
		});

		it('should subtract line height from availableHeight when adding a line and update current y position', function () {
			pageElementWriter.addLine(buildLine(40));

			assert.equal(context.y, MARGINS.top + 40);
			assert.equal(context.availableHeight, AVAILABLE_HEIGHT - 40);
		});

		it('should add repeatable fragments if they exist and a new page is created before adding the line', function () {
			addOneTenthLines(10);

			assert.equal(context.pages.length, 1);

			var rep = createRepeatable('rep', 30);
			pageElementWriter.repeatables.push(rep);

			var anotherLine = buildLine(20);
			anotherLine.marker = 'another';
			pageElementWriter.addLine(anotherLine);

			assert.equal(context.pages.length, 2);
			assert.equal(context.pages[1].items[0].item.marker, 'rep');
			assert.equal(context.pages[1].items[1].item.marker, 'another');
		});

	});

	// TODO

});
