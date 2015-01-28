var assert = require('assert');

var DocumentContext = require('../src/documentContext');
var PageElementWriter = require('../src/pageElementWriter');

describe('PageElementWriter', function() {
	var pew;
	var ctx;

	var DOCUMENT_WIDTH = 400;
	var DOCUMENT_HEIGHT = 800;

	function buildLine(height, alignment, x, y) {
		return {
			getHeight: function() { return height; },
			getWidth: function() { return 60; },
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

	function addOneTenthLines(count) {
		for(var i = 0; i < count; i++) {
			var line = buildLine((800-60-60)/10);
			pew.addLine(line);
		}
	}

	function createRepeatable(marker, height) {
		var rep = { items: [] };
		rep.height = height;

		var repLine = buildLine(height);
		repLine.marker = marker;

		rep.items.push({
            type: 'line',
            item: repLine
        });
		return rep;
	}
	beforeEach(function() {
		ctx = new DocumentContext({ width: DOCUMENT_WIDTH, height: DOCUMENT_HEIGHT }, { left: 40, right: 40, top: 60, bottom: 60 });
		pew = new PageElementWriter(ctx);
	});

	describe('addLine', function() {
		it('should add new lines if there\'s enough space left', function() {
			addOneTenthLines(10);

			assert.equal(ctx.pages.length, 1);
		});

		it('should add new pages if there\'s not enough space left', function() {
			addOneTenthLines(11);

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[0].items.length, 10);
			assert.equal(ctx.pages[1].items.length, 1);
		});

		it('should subtract line height from availableHeight when adding a line and update current y position', function() {
			pew.addLine(buildLine(40));

			assert.equal(ctx.y, 60 + 40);
			assert.equal(ctx.availableHeight, 800 - 60 - 60 - 40);
		});

		it('should add repeatable fragments if they exist and a new page is created before adding the line', function() {
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

	describe('beginUnbreakableBlock', function() {
		it('should begin a new transaction only once', function() {
			assert(pew.transactionLevel === 0);
			pew.beginUnbreakableBlock();
			var transactionCtx = pew.transactionContext;

			pew.beginUnbreakableBlock();

			assert.equal(transactionCtx, pew.transactionContext);
		});

		it('should make all further calls to addLine add lines to the transaction context instead of the page', function(){
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

	describe('commitUnbreakableBlock', function() {
		it('should commit transaction if it was called exactly the same number of time as beginUnbreakableBlock', function() {
			pew.beginUnbreakableBlock();
			pew.beginUnbreakableBlock();
			pew.addLine(buildLine(30));
			pew.commitUnbreakableBlock();

			assert.equal(ctx.pages.length, 1);
			assert.equal(ctx.pages[0].items.length, 0);
			pew.commitUnbreakableBlock();
			assert.equal(ctx.pages[0].items.length, 1);
		});

		it('should copy all elements to the current page if there\'s enough space for the whole block', function() {
			pew.addLine(buildLine(30));

			pew.beginUnbreakableBlock();
			pew.addLine(buildLine(30));
			pew.addLine(buildLine(30));

			assert.equal(ctx.pages[0].items.length, 1);

			pew.commitUnbreakableBlock();
			assert.equal(ctx.pages[0].items.length, 3);
		});

		it('should add a new page and copy elements there if there\'s not enough space on the current page', function() {
			addOneTenthLines(8);

			pew.beginUnbreakableBlock();

			addOneTenthLines(3);

			pew.commitUnbreakableBlock();

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[0].items.length, 8);
			assert.equal(ctx.pages[1].items.length, 3);
		});

		it('should move elements to the top of the page if they are added to a new page', function() {
			addOneTenthLines(8);

			pew.beginUnbreakableBlock();

			addOneTenthLines(3);

			pew.commitUnbreakableBlock();

			assert.equal(ctx.pages[1].items[0].item.x, 40);
			assert.equal(ctx.pages[1].items[0].item.y, 60);
			assert.equal(ctx.pages[1].items[1].item.x, 40);
			assert.equal(ctx.pages[1].items[1].item.y, 60 + ctx.pages[1].items[0].item.getHeight());
		});

		it('should add lines below any repeatable fragments if they exist and a new page is created', function() {
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
			assert.equal(ctx.pages[1].items[1].item.x, 40);
			assert.equal(ctx.pages[1].items[1].item.y, 60 + 50);
		});

		it('should make all further calls to addLine add lines again to the page when transaction finishes', function() {
			pew.beginUnbreakableBlock();
			pew.commitUnbreakableBlock();
			pew.addLine(buildLine(30));

			assert.equal(ctx.pages.length, 1);
			assert.equal(ctx.pages[0].items.length, 1);
		});
	});

	describe('currentBlockToRepeatable', function() {
		it('should return a copy of all elements from unbreakableBlock', function() {
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

	describe('creating a new page', function() {
		it('should add a repeatable fragment to the top', function() {
			addOneTenthLines(6);

			pew.beginUnbreakableBlock();
			var uCtx = pew.writer.context;

			addOneTenthLines(3);
			uCtx.pages[0].items.forEach(function(item) { item.item.marker = 'rep'; });
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
			assert.equal(ctx.pages[1].items[2].item.y, 60 + 2 * 68);
			assert(!ctx.pages[1].items[3].item.marker);
			assert.equal(ctx.pages[1].items[3].item.y, ctx.pages[1].items[2].item.y + 68);
		});

		it('should add repeatable fragments in the same order they have been added to the repeatable fragments collection', function() {
			addOneTenthLines(9);
			pew.repeatables.push(createRepeatable('rep1', 50));
			pew.repeatables.push(createRepeatable('rep2', 60));
			addOneTenthLines(2);

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pages[1].items.length, 3);
			assert.equal(ctx.pages[1].items[0].item.marker, 'rep1');
			assert.equal(ctx.pages[1].items[0].item.y, 60);
			assert.equal(ctx.pages[1].items[1].item.marker, 'rep2');
			assert.equal(ctx.pages[1].items[1].item.y, 60 + 50);
			assert(!ctx.pages[1].items[2].item.marker);
			assert.equal(ctx.pages[1].items[2].item.y, 60 + 50 + 60);
		});

		it('should switch width and height if page changes from portrait to landscape', function() {
			addOneTenthLines(6);
			assert.equal(ctx.pageSize.width, DOCUMENT_WIDTH);
			assert.equal(ctx.pageSize.height, DOCUMENT_HEIGHT);

			pew.moveToNextPage('landscape');

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pageSize.width, DOCUMENT_HEIGHT);
			assert.equal(ctx.pageSize.height, DOCUMENT_WIDTH);
		});

		it('should switch width and height if page changes from landscape to portrait', function() {
			ctx.pageOrientation = 'landscape';
			addOneTenthLines(6);
			pew.moveToNextPage('portrait');

			assert.equal(ctx.pages.length, 2);
			assert.equal(ctx.pageSize.width, DOCUMENT_WIDTH);
			assert.equal(ctx.pageSize.height, DOCUMENT_HEIGHT);
		});
	});
});
