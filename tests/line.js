var assert = require('assert');

var Line = require('../src/line');

describe('Line', function() {
	describe('hasEnoughSpaceForInline', function() {
		it('should return true if there is enough space left', function() {
			var line = new Line(100);
			assert(line.hasEnoughSpaceForInline({ width: 50 }));
		});

		it('should return true if line is empty, even if there is not enough space left', function() {
			var line = new Line(100);
			assert(line.hasEnoughSpaceForInline({ width: 170 }));
		});

		it('should return false if there is not enough space', function() {
			var line = new Line(100);
			line.addInline({ width: 70 });
			assert(!line.hasEnoughSpaceForInline({ width: 40 }));
		});

		it('should take into account first inline leadingCut (left-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			line.addInline({ width: 70, leadingCut: 20 });
			assert(line.hasEnoughSpaceForInline({ width: 40 }));
		});

		it('should not take into account following inline leadingCuts (left-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			line.addInline({ width: 70, leadingCut: 20 });
			line.addInline({ width: 20, leadingCut: 10 });
			line.addInline({ width: 20, leadingCut: 10 });
			assert(!line.hasEnoughSpaceForInline({ width: 20, leadingCut: 10 }));
		});

		it('should take into account last inline trailingCut (right-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			line.addInline({ width: 30 });
			line.addInline({ width: 40 });
			assert(line.hasEnoughSpaceForInline({ width: 50, trailingCut: 20 }));
		});
		it('should not take into account previous inline trailingCuts (right-trimming) when deciding if theres enough space', function() {
			var line = new Line(100);
			line.addInline({ width: 40, trailingCut: 20 });
			line.addInline({ width: 30, trailingCut: 20 });
			assert(!line.hasEnoughSpaceForInline({ width: 31 }));
		});
	});

	describe('addInline', function() {
		it('should set leadingCut when adding first inline', function() {
			var line = new Line(100);
			assert.equal(line.leadingCut, 0);
			line.addInline({width: 30, leadingCut: 20});
			assert.equal(line.leadingCut, 20);
		});

		it('should not set leadingCut when adding following inlines', function() {
			var line = new Line(100);
			line.addInline({width: 30, leadingCut: 20});
			line.addInline({width: 40, leadingCut: 20});
			assert.equal(line.leadingCut, 20);
		});

		it('should set trailingCut everytime inline is added', function() {
			var line = new Line(100);
			line.addInline({width: 30, trailingCut: 20});
			assert.equal(line.trailingCut, 20)
			line.addInline({width: 30, trailingCut: 22});
			assert.equal(line.trailingCut, 22)
		});

		it('should set x to 0 for first inline if there is no left-trimming (leadingCut)', function() {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 0, trailingCut: 20 });

			assert.equal(line.inlines[0].x, 0);
		});

		it('should set x to sum of preceding inline widths if there is no left-trimming', function() {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 });
			line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 });
			line.addInline({ width: 10, leadingCut: 0, trailingCut: 0 });

			assert.equal(line.inlines[0].x, 0)
			assert.equal(line.inlines[1].x, 40)
			assert.equal(line.inlines[2].x, 80)
		});

		it('should set x to -leadingCut for first inline when its left-trimmed', function() {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 10, trailingCut: 20 });

			assert.equal(line.inlines[0].x, -10);
		});

		it('should set x to 0 for second inline if first inline is fully trimmed (cut)', function() {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 40, trailingCut: 40 });
			line.addInline({ width: 40, leadingCut: 20, trailingCut: 20 });

			assert.equal(line.inlines[1].x, 0);
		});

		it('should set x to sum of preceding inline widths minus first inline leadingCut', function() {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 30, trailingCut: 0 });
			line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 });
			line.addInline({ width: 10, leadingCut: 0, trailingCut: 0 });
			assert.equal(line.inlines[2].x, 80 - 30);
		});

		it('should not subtract leadingCuts other than from the first inline when setting x', function() {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 30, trailingCut: 0 });
			line.addInline({ width: 40, leadingCut: 10, trailingCut: 0 });
			line.addInline({ width: 10, leadingCut: 5, trailingCut: 0 });
			assert.equal(line.inlines[2].x, 80 - 30);
		});

		it('should ignore trailingCuts when setting x', function() {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 30, trailingCut: 10 });
			line.addInline({ width: 40, leadingCut: 10, trailingCut: 10 });
			line.addInline({ width: 20, leadingCut: 5, trailingCut: 5 });
			assert.equal(line.inlines[2].x, 80 - 30);
		});
	});

	describe('getWidth', function() {
		it('should return sum of all inline widths', function() {
			var line = new Line(100);
			line.addInline({ width: 30 });
			line.addInline({ width: 20 });
			line.addInline({ width: 5 });
			assert.equal(line.getWidth(), 55);
		});

		it('should subtract first inline leadingCut (left-trimming) from total width', function() {
			var line = new Line(100);
			line.addInline({ width: 30, leadingCut: 20 });
			line.addInline({ width: 20, leadingCut: 10 });
			line.addInline({ width: 5, leadingCut: 3 });
			assert.equal(line.getWidth(), 55 - 20);
		});

		it('should subtract last inline trailingCut (right-trimming) from total width', function() {
			var line = new Line(100);
			line.addInline({ width: 30, leadingCut: 20, trailingCut: 5 });
			line.addInline({ width: 20, leadingCut: 10, trailingCut: 3 });
			line.addInline({ width: 5, leadingCut: 3, trailingCut: 1 });
			assert.equal(line.getWidth(), 55 - 20 - 1);
		});
	});

	describe.skip('getHeight', function() {
		it('should return highest inline height when baselines are equal', function() {
		});

		it('should take into account baseline offsets', function() {
		});
	})
});
