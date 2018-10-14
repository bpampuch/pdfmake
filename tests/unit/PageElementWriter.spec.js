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

	describe('beginUnbreakableBlock', function () {
		it('should begin a new transaction only once', function () {
			assert(pageElementWriter.transactionLevel === 0);
			pageElementWriter.beginUnbreakableBlock();
			var transactionContext = pageElementWriter.transactionContext;

			pageElementWriter.beginUnbreakableBlock();

			assert.equal(transactionContext, pageElementWriter.transactionContext);
		});

		it('should make all further calls to addLine add lines to the transaction context instead of the page', function () {
			pageElementWriter.beginUnbreakableBlock();
			pageElementWriter.addLine(buildLine(30));
			pageElementWriter.addLine(buildLine(30));
			var unbreakContext = pageElementWriter.context;

			assert.equal(context.pages.length, 1);
			assert.equal(context.pages[0].items.length, 0);
			assert.equal(unbreakContext.pages.length, 1);
			assert.equal(unbreakContext.pages[0].items.length, 2);
		});
	});


	describe('commitUnbreakableBlock', function () {
		it('should commit transaction if it was called exactly the same number of time as beginUnbreakableBlock', function () {
			pageElementWriter.beginUnbreakableBlock();
			pageElementWriter.beginUnbreakableBlock();
			pageElementWriter.addLine(buildLine(30));
			pageElementWriter.commitUnbreakableBlock();

			assert.equal(context.pages.length, 1);
			assert.equal(context.pages[0].items.length, 0);
			pageElementWriter.commitUnbreakableBlock();
			assert.equal(context.pages[0].items.length, 1);
		});

		it('should copy all elements to the current page if there\'s enough space for the whole block', function () {
			pageElementWriter.addLine(buildLine(30));

			pageElementWriter.beginUnbreakableBlock();
			pageElementWriter.addLine(buildLine(30));
			pageElementWriter.addLine(buildLine(30));

			assert.equal(context.pages[0].items.length, 1);

			pageElementWriter.commitUnbreakableBlock();
			assert.equal(context.pages[0].items.length, 3);
		});

		it('should add a new page and copy elements there if there\'s not enough space on the current page', function () {
			addOneTenthLines(8);

			pageElementWriter.beginUnbreakableBlock();

			addOneTenthLines(3);

			pageElementWriter.commitUnbreakableBlock();

			assert.equal(context.pages.length, 2);
			assert.equal(context.pages[0].items.length, 8);
			assert.equal(context.pages[1].items.length, 3);
		});

		it('should move elements to the top of the page if they are added to a new page', function () {
			addOneTenthLines(8);

			pageElementWriter.beginUnbreakableBlock();

			addOneTenthLines(3);

			pageElementWriter.commitUnbreakableBlock();

			assert.equal(context.pages[1].items[0].item.x, MARGINS.left);
			assert.equal(context.pages[1].items[0].item.y, MARGINS.top);
			assert.equal(context.pages[1].items[1].item.x, MARGINS.left);
			assert.equal(context.pages[1].items[1].item.y, MARGINS.top + AVAILABLE_HEIGHT / 10);
		});

		it('should add lines below any repeatable fragments if they exist and a new page is created', function () {
			addOneTenthLines(10);

			assert.equal(context.pages.length, 1);

			var rep = createRepeatable('rep', 50);
			pageElementWriter.repeatables.push(rep);

			var anotherLine = buildLine(20);
			anotherLine.marker = 'another';
			pageElementWriter.addLine(anotherLine);

			assert.equal(context.pages.length, 2);
			assert.equal(context.pages[1].items[0].item.marker, 'rep');
			assert.equal(context.pages[1].items[1].item.marker, 'another');
			assert.equal(context.pages[1].items[1].item.x, MARGINS.left);
			assert.equal(context.pages[1].items[1].item.y, MARGINS.top + 50);
		});

		it('should make all further calls to addLine add lines again to the page when transaction finishes', function () {
			pageElementWriter.beginUnbreakableBlock();
			pageElementWriter.commitUnbreakableBlock();
			pageElementWriter.addLine(buildLine(30));

			assert.equal(context.pages.length, 1);
			assert.equal(context.pages[0].items.length, 1);
		});

	});

	describe('currentBlockToRepeatable', function () {
		it('should return a copy of all elements from unbreakableBlock', function () {
			pageElementWriter.beginUnbreakableBlock();
			pageElementWriter.addLine(buildLine(30));
			pageElementWriter.addLine(buildLine(30));
			var rep = pageElementWriter.currentBlockToRepeatable();
			pageElementWriter.pushToRepeatables(rep);

			assert.equal(rep.items.length, 2);

			pageElementWriter.addLine(buildLine(30));
			assert.equal(rep.items.length, 2);
		});
	});


	describe('creating a new page', function () {
		it('should add a repeatable fragment to the top', function () {
			addOneTenthLines(6);

			pageElementWriter.beginUnbreakableBlock();
			var unbreakContext = pageElementWriter.context;

			addOneTenthLines(3);
			unbreakContext.pages[0].items.forEach(function (item) {
				item.item.marker = 'rep';
			});
			var rep = pageElementWriter.currentBlockToRepeatable();
			pageElementWriter.pushToRepeatables(rep);
			pageElementWriter.commitUnbreakableBlock();

			addOneTenthLines(3);

			assert.equal(context.pages.length, 2);
			assert.equal(context.pages[0].items.length, 10);
			assert.equal(context.pages[0].items[6].item.marker, 'rep');
			assert.equal(context.pages[0].items[7].item.marker, 'rep');
			assert.equal(context.pages[0].items[8].item.marker, 'rep');
			assert(!context.pages[0].items[9].item.marker);

			assert.equal(context.pages[1].items[0].item.marker, 'rep');
			assert.equal(context.pages[1].items[1].item.marker, 'rep');
			assert.equal(context.pages[1].items[2].item.marker, 'rep');
			assert.equal(context.pages[1].items[2].item.y, MARGINS.top + 2 * AVAILABLE_HEIGHT / 10);
			assert(!context.pages[1].items[3].item.marker);
			assert.equal(context.pages[1].items[3].item.y, context.pages[1].items[2].item.y + AVAILABLE_HEIGHT / 10);
		});
		/*
				it('should add a repeatable fragment to the top when reusing page only once', function () {
					// TODO
				});
		*/
		it('should add repeatable fragments in the same order they have been added to the repeatable fragments collection', function () {
			addOneTenthLines(9);
			pageElementWriter.repeatables.push(createRepeatable('rep1', 50));
			pageElementWriter.repeatables.push(createRepeatable('rep2', 60));
			addOneTenthLines(2);

			assert.equal(context.pages.length, 2);
			assert.equal(context.pages[1].items.length, 3);
			assert.equal(context.pages[1].items[0].item.marker, 'rep1');
			assert.equal(context.pages[1].items[0].item.y, MARGINS.top);
			assert.equal(context.pages[1].items[1].item.marker, 'rep2');
			assert.equal(context.pages[1].items[1].item.y, MARGINS.top + 50);
			assert(!context.pages[1].items[2].item.marker);
			assert.equal(context.pages[1].items[2].item.y, MARGINS.top + 50 + 60);
		});

		it('should switch width and height if page changes from portrait to landscape', function () {
			addOneTenthLines(6);
			assert.equal(context.getCurrentPage().pageSize.width, DOCUMENT_WIDTH);
			assert.equal(context.getCurrentPage().pageSize.height, DOCUMENT_HEIGHT);
			assert.equal(context.getCurrentPage().pageSize.orientation, DOCUMENT_ORIENTATION);

			pageElementWriter.moveToNextPage('landscape');

			assert.equal(context.pages.length, 2);
			assert.equal(context.getCurrentPage().pageSize.width, DOCUMENT_HEIGHT);
			assert.equal(context.getCurrentPage().pageSize.height, DOCUMENT_WIDTH);
			assert.equal(context.getCurrentPage().pageSize.orientation, 'landscape');
		});

		it('should switch width and height if page changes from landscape to portrait', function () {
			context.getCurrentPage().pageSize.orientation = 'landscape';
			context.getCurrentPage().pageSize.width = DOCUMENT_WIDTH;
			context.getCurrentPage().pageSize.height = DOCUMENT_HEIGHT;

			addOneTenthLines(6);
			pageElementWriter.moveToNextPage('portrait');

			assert.equal(context.pages.length, 2);
			assert.equal(context.getCurrentPage().pageSize.width, DOCUMENT_HEIGHT);
			assert.equal(context.getCurrentPage().pageSize.height, DOCUMENT_WIDTH);
			assert.equal(context.getCurrentPage().pageSize.orientation, 'portrait');
		});

		it('should not switch width and height if page changes from landscape to landscape', function () {
			context.pageOrientation = undefined;
			addOneTenthLines(6);
			pageElementWriter.moveToNextPage('landscape');
			pageElementWriter.moveToNextPage('landscape');

			assert.equal(context.pages.length, 3);
			assert.equal(context.getCurrentPage().pageSize.width, DOCUMENT_HEIGHT);
			assert.equal(context.getCurrentPage().pageSize.height, DOCUMENT_WIDTH);
			assert.equal(context.getCurrentPage().pageSize.orientation, 'landscape');
		});

		it('should create new page', function () {
			/*			var callCount = 0;
						pageElementWriter.on('pageChanged', () => {
							callCount++;
						});
			*/
			addOneTenthLines(1);
			pageElementWriter.moveToNextPage();

			assert.equal(context.pages.length, 2);
			assert.equal(context.y, MARGINS.top);
			assert.equal(context.availableHeight, AVAILABLE_HEIGHT);
			assert.equal(context.availableWidth, AVAILABLE_WIDTH);
			/* TODO
						assert.equal(tracker.emit.callCount, 2); // move to first page to write a line, and then move to next page
						assert.deepEqual(tracker.emit.getCall(1).args, ['pageChanged', { prevPage: 0, prevY: MARGINS.top + AVAILABLE_HEIGHT / 10, y: MARGINS.top }]);
			*/
		});

		it('should use existing page', function () {
			addOneTenthLines(1);
			context.pages.push({ items: [], pageSize: pageSize });
			context.availableWidth = 'garbage';
			context.availableHeight = 'garbage';

			pageElementWriter.moveToNextPage();

			assert.equal(context.page, 1);
			assert.equal(context.y, MARGINS.top);
			assert.equal(context.availableHeight, AVAILABLE_HEIGHT);
			assert.equal(context.availableWidth, AVAILABLE_WIDTH);
			/* TODO
						assert.equal(tracker.emit.callCount, 2);
						assert.deepEqual(tracker.emit.getCall(1).args, ['pageChanged', { prevPage: 0, prevY: MARGINS.top + AVAILABLE_HEIGHT / 10, y: MARGINS.top }]);
			*/
		});

	});

});
