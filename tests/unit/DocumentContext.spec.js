var assert = require('assert');

const DocumentContext = require('../../js/DocumentContext').default;

describe('DocumentContext', function () {
	var context;

	beforeEach(function () {
		context = new DocumentContext({ width: 400, height: 800, orientation: 'portrait' }, { left: 40, right: 40, top: 60, bottom: 60 });
	});

	it('should set initial values based on pageSize and pageMargins', function () {
		assert.equal(context.x, 40);
		assert.equal(context.y, 60);
		assert.equal(context.availableWidth, 400 - 40 - 40);
		assert.equal(context.availableHeight, 800 - 60 - 60);
	});

	describe('addMargin', function () {
		it('should change both x and availableWidth', function () {
			var x = context.x;
			var aWidth = context.availableWidth;

			context.addMargin(10);

			assert.equal(context.x, x + 10);
			assert.equal(context.availableWidth, aWidth - 10);
		});

		it('should support left and right margins', function () {
			var x = context.x;
			var aWidth = context.availableWidth;

			context.addMargin(10, 15);

			assert.equal(context.x, x + 10);
			assert.equal(context.availableWidth, aWidth - 10 - 15);
		});
	});

	describe('moveDown', function () {
		it('should change both y and availableHeight', function () {
			var y = context.y;
			var ah = context.availableHeight;

			context.moveDown(123);

			assert.equal(context.y, y + 123);
			assert.equal(context.availableHeight, ah - 123);
		});

		it('should return true if there is still some space left on the page', function () {
			assert(context.moveDown(123));
		});

		it('should return false if there\'s no space left after the operation', function () {
			assert(!context.moveDown(1200));
		});
	});

	describe('moveTo', function () {
		it('should move to X coord', function () {
			context.moveTo(50);

			assert.equal(context.x, 50);
			assert.equal(context.availableWidth, 400 - 50 - 40);
			assert.equal(context.availableHeight, 800 - 60 - 60);
		});

		it('should move to Y coord', function () {
			context.moveTo(null, 50);

			assert.equal(context.y, 50);
			assert.equal(context.availableWidth, 400 - 40 - 40);
			assert.equal(context.availableHeight, 800 - 50 - 60);
		});

		it('should move to X, Y coords', function () {
			context.moveTo(50, 50);

			assert.equal(context.x, 50);
			assert.equal(context.y, 50);
			assert.equal(context.availableWidth, 400 - 50 - 40);
			assert.equal(context.availableHeight, 800 - 50 - 60);
		});

	});

	describe('moveToNextPage', function () {
		it('should add new page in portrait', function () {
			context.moveToNextPage();

			assert.equal(context.pages[0].pageSize.orientation, 'portrait');
			assert.equal(context.pages[1].pageSize.orientation, 'portrait');
		});

		it('should add a new page in the same orientation as the previous one', function () {
			context.moveToNextPage('landscape');
			context.moveToNextPage();
			context.moveToNextPage('portrait');
			context.moveToNextPage();

			assert.equal(context.pages[0].pageSize.orientation, 'portrait');
			assert.equal(context.pages[1].pageSize.orientation, 'landscape');
			assert.equal(context.pages[2].pageSize.orientation, 'landscape');
			assert.equal(context.pages[3].pageSize.orientation, 'portrait');
			assert.equal(context.pages[4].pageSize.orientation, 'portrait');
		});
	});

	describe('addPage', function () {
		var pageSize;

		beforeEach(function () {
			pageSize = { width: 200, height: 400, orientation: 'landscape' };
		});

		it('should add a new page', function () {
			context.addPage(pageSize);

			assert.equal(context.pages.length, 2);
		});


		it('should return added page', function () {
			var page = context.addPage(pageSize);

			assert.equal(page, context.pages[context.pages.length - 1]);
		});

		it('should set y, availableHeight and availableWidth on page to initial values', function () {
			context.y = 123;
			context.availableHeight = 123;

			context.initializePage();

			assert.equal(context.y, 60);
			assert.equal(context.availableHeight, 800 - 60 - 60);
			assert.equal(context.availableWidth, 400 - 40 - 40);
		});

		// TODO
	});

	// TODO

});
