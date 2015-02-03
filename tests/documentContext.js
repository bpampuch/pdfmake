var assert = require('assert');

var DocumentContext = require('../src/documentContext');

describe('DocumentContext', function() {
	var pc;

	beforeEach(function() {
		pc = new DocumentContext({ width: 400, height: 800, orientation: 'portrait' }, { left: 40, right: 40, top: 60, bottom: 60 });
		// pc.addPage();
	});

	it('should set initial values based on pageSize and pageMargins', function() {
		assert.equal(pc.x, 40);
		assert.equal(pc.y, 60);
		assert.equal(pc.availableWidth, 400 - 40 - 40);
		assert.equal(pc.availableHeight, 800 - 60 - 60);
	});

	describe('beginColumnGroup', function() {
		it('should save current settings', function() {
			pc.beginColumnGroup();
			pc.x = 80;
			pc.page = 3;

			assert.equal(pc.snapshots.length, 1);
			assert.equal(pc.snapshots[0].x, 40);
			assert.equal(pc.snapshots[0].page, 0);
		});
	});

	describe('beginColumn', function() {
		it('should set y, page and availableHeight back to the values stored in beginColumnGroup', function() {
			pc.beginColumnGroup();
			pc.y = 150;
			pc.page = 5;
			pc.availableHeight = 123;

			pc.beginColumn();

			assert.equal(pc.y, 60);
			assert.equal(pc.page, 0);
			assert.equal(pc.availableHeight, 800 - 60 - 60);
		});

		it('should add offset to current x', function() {
			pc.beginColumnGroup();
			pc.beginColumn(50, 30);

			assert.equal(pc.x, 40 + 30);
		});

		it('should add previous column widths to x when starting a new column', function() {
			pc.beginColumnGroup();
			pc.beginColumn(30);
			assert.equal(pc.x, 40);
			pc.beginColumn(20);
			assert.equal(pc.x, 40 + 30);
		});

		it('should set availableWidth to the specified column width', function() {
			pc.beginColumnGroup();
			pc.beginColumn(30);

			assert.equal(pc.availableWidth, 30);
		});

		it('should save context in endingCell if provided', function() {
			var endingCell = {};
			pc.beginColumnGroup();
			pc.beginColumn(30, 0, endingCell);
			pc.y = 150;
			pc.page = 3;
			pc.availableHeight = 123;
			pc.beginColumn(30, 0);

			assert.equal(endingCell._columnEndingContext.y, 150);
			assert.equal(endingCell._columnEndingContext.page, 3);
			assert.equal(endingCell._columnEndingContext.availableHeight, 123);
		});
	});

	describe('completeColumnGroup', function() {
		it('should set x to the value stored in beginColumnGroup', function(){
			pc.beginColumnGroup();
			pc.x = 150;
			pc.completeColumnGroup();

			assert.equal(pc.x, 40);
		});

		it('should set page to the value pointing to the end of the longest column', function() {
			pc.beginColumnGroup();
			pc.beginColumn(30);
			pc.page = 3;
			pc.beginColumn(30);
			pc.page = 7
			pc.beginColumn(30);
			pc.page = 4;
			pc.completeColumnGroup();

			assert.equal(pc.page, 7);
		});

		it('should skip non-ending-cells (spanning over multiple rows) during vsync', function() {
			var endingCell = {};

			pc.beginColumnGroup();
			pc.beginColumn(30, 0, endingCell);
			pc.y = 150;
			pc.page = 3;
			pc.availableHeight = 123;
			pc.beginColumn(30, 0);
			pc.y = 100;
			pc.page = 3;
			pc.completeColumnGroup();

			assert.equal(pc.page, 3);
			assert.equal(pc.y, 100);
		});

		it('non-ending-cells (spanning over multiple rows) should also work with nested columns', function() {
			var endingCell = {};
			var endingCell2 = {};

			// external table
			pc.beginColumnGroup();
			// col1 spans over 2 rows
			pc.beginColumn(30, 0, endingCell);
			pc.y = 350;
			pc.beginColumn(40);
			pc.y = 100;
			// column3 contains a nested table
			pc.beginColumn(100);

				pc.beginColumnGroup();
				pc.beginColumn(20);
				pc.y = 100;
				pc.beginColumn(20);
				pc.y = 120;
				// col3.3 spans over 2 rows
				pc.beginColumn(40, 0, endingCell2);
				pc.y = 180;
				pc.completeColumnGroup();

				//// bottom of all non-spanned columns
				assert.equal(pc.y, 120);

				// second row (of nested table)
				pc.beginColumnGroup();
				pc.beginColumn(20);
				pc.y = 10;
				pc.beginColumn(20);
				pc.y = 20;
				// col3.3 spans over 2 rows
				pc.beginColumn(40, 0);
				pc.markEnding(endingCell2);
				pc.completeColumnGroup();

				//// spanned column was large enough to influence bottom
				assert.equal(pc.y, 180);
			pc.completeColumnGroup();

			//// bottom of all non-spanned columns
			assert.equal(pc.y, 180);

			// second row
			pc.beginColumnGroup();
			pc.beginColumn(30);
			pc.markEnding(endingCell);
			pc.beginColumn(40);
			pc.y = 50;
			pc.beginColumn(100);
			pc.y = 10;
			pc.completeColumnGroup();
			assert.equal(pc.y, 350);
		});
	});

	describe('addMargin', function() {
		it('should change both x and availableWidth', function() {
			var x = pc.x;
			var aWidth = pc.availableWidth;

			pc.addMargin(10);

			assert.equal(pc.x, x + 10);
			assert.equal(pc.availableWidth, aWidth - 10);
		});

		it('should support left and right margins', function() {
			var x = pc.x;
			var aWidth = pc.availableWidth;

			pc.addMargin(10, 15);

			assert.equal(pc.x, x + 10);
			assert.equal(pc.availableWidth, aWidth - 10 - 15);
		});
	});

	describe('moveDown', function() {
		it('should change both y and availableHeight', function() {
			var y = pc.y;
			var ah = pc.availableHeight;

			pc.moveDown(123);

			assert.equal(pc.y, y + 123);
			assert.equal(pc.availableHeight, ah - 123);
		});

		it('should return true if there is still some space left on the page', function() {
			assert(pc.moveDown(123));
		});

		it('should return false if there\'s no space left after the operation', function() {
			assert(!pc.moveDown(1200));
		});
	});

	describe('moveToNext page', function(){

		it('should add new page in portrait', function () {
			pc.moveToNextPage();

			assert.equal(pc.pages[0].pageSize.orientation, 'portrait');
			assert.equal(pc.pages[1].pageSize.orientation, 'portrait');
		});

		it('should add a new page in the same orientation as the previous one', function () {
			pc.moveToNextPage('landscape');
			pc.moveToNextPage();
			pc.moveToNextPage('portrait');
			pc.moveToNextPage();

			assert.equal(pc.pages[0].pageSize.orientation, 'portrait');
			assert.equal(pc.pages[1].pageSize.orientation, 'landscape');
			assert.equal(pc.pages[2].pageSize.orientation, 'landscape');
			assert.equal(pc.pages[3].pageSize.orientation, 'portrait');
			assert.equal(pc.pages[4].pageSize.orientation, 'portrait');
		});
		
	});
	
	describe('addPage', function() {
		
		var pageSize;
		
		beforeEach(function(){
			pageSize = {width: 200, height: 400, orientation: 'landscape'};
		});
		
		it('should add a new page', function() {
			
      pc.addPage(pageSize);

			assert.equal(pc.pages.length, 2);
		});
		

		it('should return added page', function() {
			var page = pc.addPage(pageSize);

			assert.equal(page, pc.pages[pc.pages.length - 1]);
		});

		it('should set y, availableHeight and availableWidth on page to initial values', function() {
			pc.y = 123;
			pc.availableHeight = 123;

			pc.initializePage();

			assert.equal(pc.y, 60);
			assert.equal(pc.availableHeight, 800 - 60 - 60);
			assert.equal(pc.availableWidth, 400 - 40 - 40);
		});

    it('should keep column width when in column group, but set page width', function() {
      pc.beginColumnGroup();
      pc.beginColumn(100, 0, {});
      pc.initializePage();

      assert.equal(pc.availableWidth, 100);

      pc.completeColumnGroup();

      assert.equal(pc.availableWidth, 400 - 40 - 40);
    });
	});

	describe('bottomMostContext', function() {
		it('should return context with larger page if pages are different', function() {
			var result = DocumentContext.bottomMostContext({ page: 2, y: 10 }, { page: 3, y: 5 });
			assert.equal(result.page, 3);
			assert.equal(result.y, 5);
		});

		it('should return context with larger y if both contexts have the same page', function() {
			var result = DocumentContext.bottomMostContext({ page: 3, y: 100 }, { page: 3, y: 50 });
			assert.equal(result.page, 3);
			assert.equal(result.y, 100);
		});
	});

	it('should support nesting', function(){
		pc.beginColumnGroup();
		pc.beginColumn(50)
		pc.y = 200;
		pc.beginColumn(40);
		pc.y = 150;
		pc.beginColumn(80);

		pc.beginColumnGroup();

		assert.equal(pc.snapshots.length, 2);
		assert.equal(pc.snapshots[1].x, 40 + 50 + 40);

		pc.beginColumn(20);
		pc.y = 240;
		pc.page = 2;
		pc.beginColumn(20);
		pc.y = 260;
		pc.completeColumnGroup();

		assert.equal(pc.snapshots.length, 1);
		assert.equal(pc.x, 40 + 50 + 40);
		assert.equal(pc.page, 2);
		assert.equal(pc.y, 240);

		pc.completeColumnGroup();

		assert.equal(pc.snapshots.length, 0);
		assert.equal(pc.x, 40);
		assert.equal(pc.page, 2);
		assert.equal(pc.y, 240);
	});
});
