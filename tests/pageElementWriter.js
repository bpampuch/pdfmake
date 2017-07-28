/* jslint node: true */
'use strict';

var assert = require('assert');
var sinon = require('sinon');

var DocumentContext = require('../src/documentContext');
var PageElementWriter = require('../src/pageElementWriter');

describe('PageElementWriter', function () {
	var pew, ctx, tracker, pageSize;

	var DOCUMENT_WIDTH = 600;
	var DOCUMENT_HEIGHT = 1100;
	var DOCUMENT_ORIENTATION = 'portrait';
	var INLINE_TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg==';

	var MARGINS = {
		left: 40,
		right: 60,
		top: 30,
		bottom: 70
	};

	var AVAILABLE_HEIGHT = 1000;
	var AVAILABLE_WIDTH = 500;

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
	}

	function buildImage(height) {
		return {
			image: INLINE_TEST_IMAGE,
			_margin: null,
			_maxWidth: 100,
			_minWidth: 100,
			_width: 100,
			_height: height,
			positions: []
		};
	}

	function addOneTenthLines(count) {
		var lastPosition;
		for (var i = 0; i < count; i++) {
			var line = buildLine(AVAILABLE_HEIGHT / 10);
			lastPosition = pew.addLine(line);
		}
		return lastPosition;
	}

	function createRepeatable(marker, height) {
		var rep = {items: []};
		rep.height = height;

		var repLine = buildLine(height);
		repLine.marker = marker;

		rep.items.push({
			type: 'line',
			item: repLine
		});
		return rep;
	}

	beforeEach(function () {
		pageSize = {width: DOCUMENT_WIDTH, height: DOCUMENT_HEIGHT, orientation: DOCUMENT_ORIENTATION};
		ctx = new DocumentContext(pageSize, MARGINS);
		tracker = {emit: sinon.spy()};
		pew = new PageElementWriter(ctx, tracker);
	});

	describe('addLine', function () {
		it('should add new lines if there\'s enough space left', function () {
			var position = addOneTenthLines(10);

			assert.equal(ctx.pages.length, 1);
			assert.deepEqual(position, {pageNumber: 1, left: MARGINS.left, top: (9 / 10 * AVAILABLE_HEIGHT) + MARGINS.top, verticalRatio: 0.9, horizontalRatio: 0, pageOrientation: 'portrait', pageInnerHeight: 1000, pageInnerWidth: 500});
		});

		it('should add new pages if there\'s not enough space left', function () {
			var position = addOneTenthLines(11);

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[0].items.length, 10);
			assert.equal(ctx.pages[1].items.length, 1);
			assert.deepEqual(position, {pageNumber: 2, left: MARGINS.left, top: MARGINS.top, verticalRatio: 0, horizontalRatio: 0, pageOrientation: 'portrait', pageInnerHeight: 1000, pageInnerWidth: 500});
		});

		it('should subtract line height from availableHeight when adding a line and update current y position', function () {
			pew.addLine(buildLine(40));

			assert.equal(ctx.y, MARGINS.top + 40);
			assert.equal(ctx.availableHeight, AVAILABLE_HEIGHT - 40);
		});

		it('should add repeatable fragments if they exist and a new page is created before adding the line', function () {
			addOneTenthLines(10);

			assert.equal(ctx.pages.length, 1);

			var rep = createRepeatable('rep', 30);
			pew.repeatables.push(rep);

			var anotherLine = buildLine(20);
			anotherLine.marker = 'another';
			pew.addLine(anotherLine);

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[1].items[0].item.marker, 'rep');
			assert.equal(ctx.pages[1].items[1].item.marker, 'another');
		});
	});

	describe('addImage', function () {
		it('should add the image image if something else exists on the page and there\'s enough space left', function () {
			var lineHeight = 400;
			pew.addLine(buildLine(lineHeight));

			var position = pew.addImage(buildImage(300));

			assert.equal(ctx.pages.length, 1);
			assert.deepEqual(position, {pageNumber: 1, left: MARGINS.left, top: lineHeight + MARGINS.top, verticalRatio: 0.4, horizontalRatio: 0, pageOrientation: 'portrait', pageInnerHeight: 1000, pageInnerWidth: 500});
		});

		it('should add a new page if something else exists on the page and there\'s not enough space left', function () {
			var lineHeight = 900;
			pew.addLine(buildLine(lineHeight));

			var position = pew.addImage(buildImage(300));

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[0].items.length, 1);
			assert.equal(ctx.pages[1].items.length, 1);
			assert.deepEqual(position, {pageNumber: 2, left: MARGINS.left, top: MARGINS.top, verticalRatio: 0, horizontalRatio: 0, pageOrientation: 'portrait', pageInnerHeight: 1000, pageInnerWidth: 500});
		});

		it('should write into the current page if it\'s a large image and nothing else exists on the page', function () {
			var position = pew.addImage(buildImage(2000));

			assert.equal(ctx.pages.length, 1);
			assert.equal(ctx.pages[0].items.length, 1);
			assert.deepEqual(position, {pageNumber: 1, left: MARGINS.left, top: MARGINS.top, verticalRatio: 0, horizontalRatio: 0, pageOrientation: 'portrait', pageInnerHeight: 1000, pageInnerWidth: 500});
		});

		it('should write into the a new page page if it\'s a large image and something else does exist on the page', function () {
			pew.addLine(buildLine(1));
			var position = pew.addImage(buildImage(2000));

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[0].items.length, 1);
			assert.equal(ctx.pages[1].items.length, 1);
			assert.deepEqual(position, {pageNumber: 2, left: MARGINS.left, top: MARGINS.top, verticalRatio: 0, horizontalRatio: 0, pageOrientation: 'portrait', pageInnerHeight: 1000, pageInnerWidth: 500});
		});
	});

	describe('beginUnbreakableBlock', function () {
		it('should begin a new transaction only once', function () {
			assert(pew.transactionLevel === 0);
			pew.beginUnbreakableBlock();
			var transactionCtx = pew.transactionContext;

			pew.beginUnbreakableBlock();

			assert.equal(transactionCtx, pew.transactionContext);
		});

		it('should make all further calls to addLine add lines to the transaction context instead of the page', function () {
			pew.beginUnbreakableBlock();
			pew.addLine(buildLine(30));
			pew.addLine(buildLine(30));
			var uCtx = pew.writer.context;

			assert.equal(ctx.pages.length, 1);
			assert.equal(ctx.pages[0].items.length, 0);
			assert.equal(uCtx.pages.length, 1);
			assert.equal(uCtx.pages[0].items.length, 2);
		});
	});

	describe('commitUnbreakableBlock', function () {
		it('should commit transaction if it was called exactly the same number of time as beginUnbreakableBlock', function () {
			pew.beginUnbreakableBlock();
			pew.beginUnbreakableBlock();
			pew.addLine(buildLine(30));
			pew.commitUnbreakableBlock();

			assert.equal(ctx.pages.length, 1);
			assert.equal(ctx.pages[0].items.length, 0);
			pew.commitUnbreakableBlock();
			assert.equal(ctx.pages[0].items.length, 1);
		});

		it('should copy all elements to the current page if there\'s enough space for the whole block', function () {
			pew.addLine(buildLine(30));

			pew.beginUnbreakableBlock();
			pew.addLine(buildLine(30));
			pew.addLine(buildLine(30));

			assert.equal(ctx.pages[0].items.length, 1);

			pew.commitUnbreakableBlock();
			assert.equal(ctx.pages[0].items.length, 3);
		});

		it('should add a new page and copy elements there if there\'s not enough space on the current page', function () {
			addOneTenthLines(8);

			pew.beginUnbreakableBlock();

			addOneTenthLines(3);

			pew.commitUnbreakableBlock();

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[0].items.length, 8);
			assert.equal(ctx.pages[1].items.length, 3);
		});

		it('should move elements to the top of the page if they are added to a new page', function () {
			addOneTenthLines(8);

			pew.beginUnbreakableBlock();

			addOneTenthLines(3);

			pew.commitUnbreakableBlock();

			assert.equal(ctx.pages[1].items[0].item.x, MARGINS.left);
			assert.equal(ctx.pages[1].items[0].item.y, MARGINS.top);
			assert.equal(ctx.pages[1].items[1].item.x, MARGINS.left);
			assert.equal(ctx.pages[1].items[1].item.y, MARGINS.top + AVAILABLE_HEIGHT / 10);
		});

		it('should add lines below any repeatable fragments if they exist and a new page is created', function () {
			addOneTenthLines(10);

			assert.equal(ctx.pages.length, 1);

			var rep = createRepeatable('rep', 50);
			pew.repeatables.push(rep);

			var anotherLine = buildLine(20);
			anotherLine.marker = 'another';
			pew.addLine(anotherLine);

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[1].items[0].item.marker, 'rep');
			assert.equal(ctx.pages[1].items[1].item.marker, 'another');
			assert.equal(ctx.pages[1].items[1].item.x, MARGINS.left);
			assert.equal(ctx.pages[1].items[1].item.y, MARGINS.top + 50);
		});

		it('should make all further calls to addLine add lines again to the page when transaction finishes', function () {
			pew.beginUnbreakableBlock();
			pew.commitUnbreakableBlock();
			pew.addLine(buildLine(30));

			assert.equal(ctx.pages.length, 1);
			assert.equal(ctx.pages[0].items.length, 1);
		});
	});

	describe('currentBlockToRepeatable', function () {
		it('should return a copy of all elements from unbreakableBlock', function () {
			pew.beginUnbreakableBlock();
			pew.addLine(buildLine(30));
			pew.addLine(buildLine(30));
			var rep = pew.currentBlockToRepeatable();
			pew.pushToRepeatables(rep);

			assert.equal(rep.items.length, 2);

			pew.addLine(buildLine(30));
			assert.equal(rep.items.length, 2);
		});
	});

	describe('creating a new page', function () {
		it('should add a repeatable fragment to the top', function () {
			addOneTenthLines(6);

			pew.beginUnbreakableBlock();
			var uCtx = pew.writer.context;

			addOneTenthLines(3);
			uCtx.pages[0].items.forEach(function (item) {
				item.item.marker = 'rep';
			});
			var rep = pew.currentBlockToRepeatable();
			pew.pushToRepeatables(rep);
			pew.commitUnbreakableBlock();

			addOneTenthLines(3);

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[0].items.length, 10);
			assert.equal(ctx.pages[0].items[6].item.marker, 'rep');
			assert.equal(ctx.pages[0].items[7].item.marker, 'rep');
			assert.equal(ctx.pages[0].items[8].item.marker, 'rep');
			assert(!ctx.pages[0].items[9].item.marker);

			assert.equal(ctx.pages[1].items[0].item.marker, 'rep');
			assert.equal(ctx.pages[1].items[1].item.marker, 'rep');
			assert.equal(ctx.pages[1].items[2].item.marker, 'rep');
			assert.equal(ctx.pages[1].items[2].item.y, MARGINS.top + 2 * AVAILABLE_HEIGHT / 10);
			assert(!ctx.pages[1].items[3].item.marker);
			assert.equal(ctx.pages[1].items[3].item.y, ctx.pages[1].items[2].item.y + AVAILABLE_HEIGHT / 10);
		});

		it('should reserve space for repeatable fragment to the top when reusing page', function () {
			addOneTenthLines(6);

			pew.beginUnbreakableBlock();
			var uCtx = pew.writer.context;

			addOneTenthLines(3);
			uCtx.pages[0].items.forEach(function (item) {
				item.item.marker = 'rep';
			});
			var rep = pew.currentBlockToRepeatable();
			pew.pushToRepeatables(rep);
			pew.commitUnbreakableBlock();


			ctx.pages.push({items: [], pageSize: pageSize});

			addOneTenthLines(2);

			assert.equal(ctx.pages.length, 2);

			assert.equal(ctx.pages[1].items[0].item.y, MARGINS.top + 3 * AVAILABLE_HEIGHT / 10);
		});

		it('should add repeatable fragments in the same order they have been added to the repeatable fragments collection', function () {
			addOneTenthLines(9);
			pew.repeatables.push(createRepeatable('rep1', 50));
			pew.repeatables.push(createRepeatable('rep2', 60));
			addOneTenthLines(2);

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[1].items.length, 3);
			assert.equal(ctx.pages[1].items[0].item.marker, 'rep1');
			assert.equal(ctx.pages[1].items[0].item.y, MARGINS.top);
			assert.equal(ctx.pages[1].items[1].item.marker, 'rep2');
			assert.equal(ctx.pages[1].items[1].item.y, MARGINS.top + 50);
			assert(!ctx.pages[1].items[2].item.marker);
			assert.equal(ctx.pages[1].items[2].item.y, MARGINS.top + 50 + 60);
		});

		it('should switch width and height if page changes from portrait to landscape', function () {
			addOneTenthLines(6);
			assert.equal(ctx.getCurrentPage().pageSize.width, DOCUMENT_WIDTH);
			assert.equal(ctx.getCurrentPage().pageSize.height, DOCUMENT_HEIGHT);
			assert.equal(ctx.getCurrentPage().pageSize.orientation, DOCUMENT_ORIENTATION);

			pew.moveToNextPage('landscape');

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.getCurrentPage().pageSize.width, DOCUMENT_HEIGHT);
			assert.equal(ctx.getCurrentPage().pageSize.height, DOCUMENT_WIDTH);
			assert.equal(ctx.getCurrentPage().pageSize.orientation, 'landscape');
		});

		it('should switch width and height if page changes from landscape to portrait', function () {
			ctx.getCurrentPage().pageSize.orientation = 'landscape';
			ctx.getCurrentPage().pageSize.width = DOCUMENT_WIDTH;
			ctx.getCurrentPage().pageSize.height = DOCUMENT_HEIGHT;

			addOneTenthLines(6);
			pew.moveToNextPage('portrait');

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.getCurrentPage().pageSize.width, DOCUMENT_HEIGHT);
			assert.equal(ctx.getCurrentPage().pageSize.height, DOCUMENT_WIDTH);
			assert.equal(ctx.getCurrentPage().pageSize.orientation, 'portrait');
		});

		it('should not switch width and height if page changes from landscape to landscape', function () {
			ctx.pageOrientation = undefined;
			addOneTenthLines(6);
			pew.moveToNextPage('landscape');
			pew.moveToNextPage('landscape');

			assert.equal(ctx.pages.length, 3);
			assert.equal(ctx.getCurrentPage().pageSize.width, DOCUMENT_HEIGHT);
			assert.equal(ctx.getCurrentPage().pageSize.height, DOCUMENT_WIDTH);
			assert.equal(ctx.getCurrentPage().pageSize.orientation, 'landscape');
		});

		it('should create new page', function () {
			addOneTenthLines(1);
			pew.moveToNextPage();

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.y, MARGINS.top);
			assert.equal(ctx.availableHeight, AVAILABLE_HEIGHT);
			assert.equal(ctx.availableWidth, AVAILABLE_WIDTH);
			assert.equal(tracker.emit.callCount, 2); // move to first page to write a line, and then move to next page
			assert.deepEqual(tracker.emit.getCall(1).args, ['pageChanged', {prevPage: 0, prevY: MARGINS.top + AVAILABLE_HEIGHT / 10, y: MARGINS.top}]);
		});

		it('should use existing page', function () {
			addOneTenthLines(1);
			ctx.pages.push({items: [], pageSize: pageSize});
			ctx.availableWidth = 'garbage';
			ctx.availableHeight = 'garbage';

			pew.moveToNextPage();

			assert.equal(ctx.page, 1);
			assert.equal(ctx.y, MARGINS.top);
			assert.equal(ctx.availableHeight, AVAILABLE_HEIGHT);
			assert.equal(ctx.availableWidth, AVAILABLE_WIDTH);
			assert.equal(tracker.emit.callCount, 2);
			assert.deepEqual(tracker.emit.getCall(1).args, ['pageChanged', {prevPage: 0, prevY: MARGINS.top + AVAILABLE_HEIGHT / 10, y: MARGINS.top}]);
		});
	});
});
