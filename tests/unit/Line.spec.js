'use strict';

var assert = require('assert');

var Line = require('../../js/Line').default;

describe('Line', function () {
	describe('addInline', function () {
		it('should set leadingCut when adding first inline', function () {
			var line = new Line(100);
			assert.equal(line.leadingCut, 0);
			line.addInline({ width: 30, leadingCut: 20 });
			assert.equal(line.leadingCut, 20);
		});

		it('should not set leadingCut when adding following inlines', function () {
			var line = new Line(100);
			line.addInline({ width: 30, leadingCut: 20 });
			line.addInline({ width: 40, leadingCut: 20 });
			assert.equal(line.leadingCut, 20);
		});

		it('should set trailingCut everytime inline is added', function () {
			var line = new Line(100);
			line.addInline({ width: 30, trailingCut: 20 });
			assert.equal(line.trailingCut, 20);
			line.addInline({ width: 30, trailingCut: 22 });
			assert.equal(line.trailingCut, 22);
		});

		it('should set x to 0 for first inline if there is no left-trimming (leadingCut)', function () {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 0, trailingCut: 20 });

			assert.equal(line.inlines[0].x, 0);
		});

		it('should set x to sum of preceding inline widths if there is no left-trimming', function () {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 });
			line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 });
			line.addInline({ width: 10, leadingCut: 0, trailingCut: 0 });

			assert.equal(line.inlines[0].x, 0);
			assert.equal(line.inlines[1].x, 40);
			assert.equal(line.inlines[2].x, 80);
		});

		it('should set x to -leadingCut for first inline when its left-trimmed', function () {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 10, trailingCut: 20 });

			assert.equal(line.inlines[0].x, -10);
		});

		it('should set x to 0 for second inline if first inline is fully trimmed (cut)', function () {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 40, trailingCut: 40 });
			line.addInline({ width: 40, leadingCut: 20, trailingCut: 20 });

			assert.equal(line.inlines[1].x, 0);
		});

		it('should set x to sum of preceding inline widths minus first inline leadingCut', function () {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 30, trailingCut: 0 });
			line.addInline({ width: 40, leadingCut: 0, trailingCut: 0 });
			line.addInline({ width: 10, leadingCut: 0, trailingCut: 0 });
			assert.equal(line.inlines[2].x, 80 - 30);
		});

		it('should not subtract leadingCuts other than from the first inline when setting x', function () {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 30, trailingCut: 0 });
			line.addInline({ width: 40, leadingCut: 10, trailingCut: 0 });
			line.addInline({ width: 10, leadingCut: 5, trailingCut: 0 });
			assert.equal(line.inlines[2].x, 80 - 30);
		});

		it('should ignore trailingCuts when setting x', function () {
			var line = new Line(100);
			line.addInline({ width: 40, leadingCut: 30, trailingCut: 10 });
			line.addInline({ width: 40, leadingCut: 10, trailingCut: 10 });
			line.addInline({ width: 20, leadingCut: 5, trailingCut: 5 });
			assert.equal(line.inlines[2].x, 80 - 30);
		});
	});

	describe('getHeight', function () {
		it('should return zero for an empty line', function () {
			assert.equal(new Line(100).getHeight(), 0);
		});

		it('should return the highest inline height regardless of inline order', function () {
			[[10, 30, 20], [30, 20, 10]].forEach(function (heights) {
				var line = new Line(100);
				heights.forEach(height => line.addInline({ width: 10, height: height }));
				assert.equal(line.getHeight(), 30);
			});
		});

		it('should ignore inlines without a height', function () {
			var line = new Line(100);
			line.addInline({ width: 10 });
			line.addInline({ width: 10, height: 20 });
			assert.equal(line.getHeight(), 20);
		});
	});

	describe('getAscenderHeight', function () {
		it('should return zero for an empty line', function () {
			assert.equal(new Line(100).getAscenderHeight(), 0);
		});

		it('should use the largest scaled ascender rather than the largest font size', function () {
			var line = new Line(100);
			line.addInline({ width: 10, fontSize: 30, font: { ascender: 500 } });
			line.addInline({ width: 10, fontSize: 20, font: { ascender: 900 } });
			line.addInline({ width: 10, fontSize: 10, font: { ascender: 800 } });
			assert.equal(line.getAscenderHeight(), 18);
		});
	});

	describe('getWidth', function () {
		it('should return sum of all inline widths', function () {
			var line = new Line(100);
			line.addInline({ width: 30 });
			line.addInline({ width: 20 });
			line.addInline({ width: 5 });
			assert.equal(line.getWidth(), 55);
		});

		it('should subtract first inline leadingCut (left-trimming) from total width', function () {
			var line = new Line(100);
			line.addInline({ width: 30, leadingCut: 20 });
			line.addInline({ width: 20, leadingCut: 10 });
			line.addInline({ width: 5, leadingCut: 3 });
			assert.equal(line.getWidth(), 55 - 20);
		});

		it('should subtract last inline trailingCut (right-trimming) from total width', function () {
			var line = new Line(100);
			line.addInline({ width: 30, leadingCut: 20, trailingCut: 5 });
			line.addInline({ width: 20, leadingCut: 10, trailingCut: 3 });
			line.addInline({ width: 5, leadingCut: 3, trailingCut: 1 });
			assert.equal(line.getWidth(), 55 - 20 - 1);
		});
	});

	describe('getAvailableWidth', function () {
		it('should return the full width for an empty line', function () {
			assert.equal(new Line(100).getAvailableWidth(), 100);
		});

		it('should account for leading and trailing cuts', function () {
			var line = new Line(100);
			line.addInline({ width: 50, leadingCut: 10 });
			line.addInline({ width: 30, trailingCut: 5 });
			assert.equal(line.getAvailableWidth(), 35);
		});

		it('should return a negative width when the line overflows', function () {
			var line = new Line(100);
			line.addInline({ width: 120 });
			assert.equal(line.getAvailableWidth(), -20);
		});
	});

	describe('hasEnoughSpaceForInline', function () {
		it('should return true if there is enough space left', function () {
			var line = new Line(100);
			assert(line.hasEnoughSpaceForInline({ width: 50 }));
		});

		it('should return true if line is empty, even if there is not enough space left', function () {
			var line = new Line(100);
			assert(line.hasEnoughSpaceForInline({ width: 170 }));
		});

		it('should return false if there is not enough space', function () {
			var line = new Line(100);
			line.addInline({ width: 70 });
			assert(!line.hasEnoughSpaceForInline({ width: 40 }));
		});

		it('should take into account first inline leadingCut (left-trimming) when deciding if theres enough space', function () {
			var line = new Line(100);
			line.addInline({ width: 70, leadingCut: 20 });
			assert(line.hasEnoughSpaceForInline({ width: 40 }));
		});

		it('should not take into account following inline leadingCuts (left-trimming) when deciding if theres enough space', function () {
			var line = new Line(100);
			line.addInline({ width: 70, leadingCut: 20 });
			line.addInline({ width: 20, leadingCut: 10 });
			line.addInline({ width: 20, leadingCut: 10 });
			assert(!line.hasEnoughSpaceForInline({ width: 20, leadingCut: 10 }));
		});

		it('should take into account last inline trailingCut (right-trimming) when deciding if theres enough space', function () {
			var line = new Line(100);
			line.addInline({ width: 30 });
			line.addInline({ width: 40 });
			assert(line.hasEnoughSpaceForInline({ width: 50, trailingCut: 20 }));
		});

		it('should not take into account previous inline trailingCuts (right-trimming) when deciding if theres enough space', function () {
			var line = new Line(100);
			line.addInline({ width: 40, trailingCut: 20 });
			line.addInline({ width: 30, trailingCut: 20 });
			assert(!line.hasEnoughSpaceForInline({ width: 31 }));
		});

		it('should reject an inline when its unbreakable continuation does not fit', function () {
			var line = new Line(100);
			line.addInline({ width: 40 });
			assert.equal(line.hasEnoughSpaceForInline({ width: 20, noNewLine: true }, [
				{ width: 30, noNewLine: true }, { width: 20 }
			]), false);
		});

		it('should stop measuring the continuation at the first allowed line break', function () {
			var line = new Line(100);
			line.addInline({ width: 40 });
			assert.equal(line.hasEnoughSpaceForInline({ width: 20, noNewLine: true }, [
				{ width: 20, noNewLine: true }, { width: 20 }, { width: 100 }
			]), true);
		});

		it('should account for trimming when an unbreakable continuation exactly fits', function () {
			var line = new Line(100);
			line.addInline({ width: 50, leadingCut: 10 });
			assert.equal(line.hasEnoughSpaceForInline({ width: 30, noNewLine: true }, [
				{ width: 40, trailingCut: 10 }
			]), true);
		});

		it('should ignore following inlines when the current inline allows a line break', function () {
			var line = new Line(100);
			line.addInline({ width: 40 });
			assert.equal(line.hasEnoughSpaceForInline({ width: 20 }, [{ width: 100 }]), true);
		});

		it('should reject further inlines after an explicit line break', function () {
			var line = new Line(100);
			line.addInline({ width: 10, lineEnd: true });
			assert.equal(line.hasEnoughSpaceForInline({ width: 10 }), false);
		});
	});
});
