var assert = require('assert');

var pdfMake = require('../src/layout.js');
var Line = pdfMake.Line;

describe('Line', function() {
	describe('addInline', function() {
		it('should add inline if there is enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 50 }));
			assert.equal(line.inlines.length, 1);
		});
		it('should add first inline even if theres not enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 170 }));
			assert.equal(line.inlines.length, 1);
		});
		it('should not add following inlines if theres not enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 70 }));
			assert(!line.addInline({ width: 40 }));
			assert.equal(line.inlines.length, 1);
		});
		it('should take into account first inline leadingCut (left-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 70, leadingCut: 20 }));
			assert(line.addInline({ width: 40 }));
			assert.equal(line.inlines.length, 2);
		});
		it('should not take into account following inline leadingCuts (left-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 70, leadingCut: 20 }));
			assert(line.addInline({ width: 20, leadingCut: 10 }));
			assert(line.addInline({ width: 20, leadingCut: 10 }));
			assert(!line.addInline({ width: 20, leadingCut: 10 }));
			assert.equal(line.inlines.length, 3);
		});
		it('should take into account last inline trailingCut (right-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 30 }));
			assert(line.addInline({ width: 40 }));
			assert(line.addInline({ width: 50, trailingCut: 20 }));
			assert.equal(line.inlines.length, 3);
		});
		it('should not take into account previous inline trailingCuts (right-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, trailingCut: 20 }));
			assert(line.addInline({ width: 30, trailingCut: 20 }));
			assert(!line.addInline({ width: 31 }));
			assert.equal(line.inlines.length, 2);
		});

		it('should set x to 0 for first inline if there is no left-trimming (leadingCut)', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 0, trailingCut: 20 }));
			assert.equal(line.inlines[0].x, 0);
		});

		it('should set x to sum of preceding inline widths if there is no left-trimming', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 }));
			assert(line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 }));
			assert(line.addInline({ width: 10, leadingCut: 0, trailingCut: 0 }));
			assert.equal(line.inlines[2].x, 80);
		});

		it('should set x to -leadingCut for first inline when its left-trimmed', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 10, trailingCut: 20 }));
			assert.equal(line.inlines[0].x, -10);
		});

		it('should set x to 0 for second inline if first inline is fully trimmed (cut)', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 40, trailingCut: 40 }));
			assert(line.addInline({ width: 40, leadingCut: 40, trailingCut: 40 }));
			assert.equal(line.inlines[1].x, 0);
		});

		it('should set x to sum of preceding inline widths minus first inline leadingCut', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 30, trailingCut: 0 }));
			assert(line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 }));
			assert(line.addInline({ width: 10, leadingCut: 0, trailingCut: 0 }));
			assert.equal(line.inlines[2].x, 80 - 30);
		});

		it('should not subtract leadingCuts other than the from first inline when setting x', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 30, trailingCut: 0 }));
			assert(line.addInline({ width: 40, leadingCut: 10, trailingCut: 0 }));
			assert(line.addInline({ width: 10, leadingCut: 5, trailingCut: 0 }));
			assert.equal(line.inlines[2].x, 80 - 30);
		});

		it('should ignore trailingCuts when setting x', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 40, leadingCut: 30, trailingCut: 10 }));
			assert(line.addInline({ width: 40, leadingCut: 10, trailingCut: 10 }));
			assert(line.addInline({ width: 20, leadingCut: 5, trailingCut: 5 }));
			assert.equal(line.inlines[2].x, 80 - 30);
		});
	});

	describe('getWidth', function() {
		it('should return sum of all inline widths', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 30 }));
			assert(line.addInline({ width: 20 }));
			assert(line.addInline({ width: 5 }));
			assert.equal(line.getWidth(), 55);
		});

		it('should subtract first inline leadingCut (left-trimming) from total width', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 30, leadingCut: 20 }));
			assert(line.addInline({ width: 20, leadingCut: 10 }));
			assert(line.addInline({ width: 5, leadingCut: 3 }));
			assert.equal(line.getWidth(), 55 - 20);
		});

		it('should subtract last inline trailingCut (right-trimming) from total width', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 30, leadingCut: 20, trailingCut: 5 }));
			assert(line.addInline({ width: 20, leadingCut: 10, trailingCut: 3 }));
			assert(line.addInline({ width: 5, leadingCut: 3, trailingCut: 1 }));
			assert.equal(line.getWidth(), 55 - 20 - 1);
		});
	});

	describe('getMinWidth', function() {
		it('should return longest inline trimmed width', function() {
			var line = new Line(100);
			assert(line.addInline({ width: 30, leadingCut: 10, trailingCut: 5 }));
			assert(line.addInline({ width: 20, leadingCut: 3, trailingCut: 7 }));
			assert(line.addInline({ width: 40, leadingCut: 9, trailingCut: 6 }));
			assert.equal(line.getMinWidth(), 25);
		});
	});

	describe.skip('getHeight', function() {
		it('should return highest inline height when baselines are equal', function() {
		});

		it('should take into account baseline offsets', function() {
		});
	})
});