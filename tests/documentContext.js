var assert = require('assert');

var pdfMake = require('../src/layout.js');
var DocumentContext = pdfMake.DocumentContext;


describe('DocumentContext', function() {
	var pc;

	beforeEach(function() {
		pc = new DocumentContext({ width: 400, height: 800 }, { left: 40, right: 40, top: 60, bottom: 60 });
		pc.addPage();
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

	describe('addPage', function() {
		it('should add a new page', function() {
			pc.addPage();

			assert.equal(pc.pages.length, 2);
		});

		it('should return added page', function() {
			var page = pc.addPage();

			assert.equal(page, pc.pages[pc.pages.length - 1]);
		});

		it('should set y and availableHeight to initial values', function() {
			pc.y = 123;
			pc.availableHeight = 123;

			pc.moveToPageTop();

			assert.equal(pc.y, 60);
			assert.equal(pc.availableHeight, 800 - 60 - 60);
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
