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

		// TODO

		/*
		it('should return highest inline height when baselines are equal', function () {
		});

		it('should take into account baseline offsets', function () {
		});
		*/
	});

	describe('getAscenderHeight', function () {

		// TODO

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

		// TODO

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

		// TODO: test for nextInlines with noNewLine
	});

	describe('optimizeInlines', function () {
		it('should optimize inlines with the same style', function () {
			var line = new Line(1000);
			line.addInline({ text: 'Inline ', fontSize: 12, height: 14.06, width: 31.69, leadingCut: 0, trailingCut: 2.97 });
			line.addInline({ text: 'text ', fontSize: 12, height: 14.06, width: 23.14, leadingCut: 0, trailingCut: 2.97 });
			line.addInline({ text: 'works ', fontSize: 12, height: 14.06, width: 32.20, leadingCut: 0, trailingCut: 2.97 });
			line.optimizeInlines();
			assert.strictEqual(line.inlines.length, 1);
			assert.strictEqual(line.inlines[0].text, 'Inline text works ');
			assert.strictEqual(line.inlines[0].width, 31.69 + 23.14 + 32.20);
		});

		it('should not optimize inlines with different styles', function () {
			var line = new Line(1000);
			line.addInline({ text: 'Bigger', fontSize: 15, height: 17.57, width: 42.87, leadingCut: 0, trailingCut: 0 });
			line.addInline({ text: 'Inline ', fontSize: 12, height: 14.06, width: 31.69, leadingCut: 0, trailingCut: 2.97 });
			line.addInline({ text: 'text ', fontSize: 12, height: 14.06, width: 23.14, leadingCut: 0, trailingCut: 2.97 });
			line.addInline({ text: 'works ', fontSize: 12, height: 14.06, width: 32.20, leadingCut: 0, trailingCut: 2.97 });
			line.optimizeInlines();
			assert.strictEqual(line.inlines.length, 2);
			assert.strictEqual(line.inlines[0].text, 'Bigger');
			assert.strictEqual(line.inlines[1].text, 'Inline text works ');
			assert.strictEqual(line.inlines[1].width, 31.69 + 23.14 + 32.20);
		});

		it('should set x to x of the first optimized inline', function () {
			var line = new Line(1000);
			line.addInline({ text: 'Bigger', fontSize: 15, height: 17.57, width: 42.87, leadingCut: 0, trailingCut: 0 });
			line.addInline({ text: 'Inline ', fontSize: 12, height: 14.06, width: 31.69, leadingCut: 0, trailingCut: 2.97 });
			line.addInline({ text: 'text ', fontSize: 12, height: 14.06, width: 23.14, leadingCut: 0, trailingCut: 2.97 });
			line.addInline({ text: 'works ', fontSize: 12, height: 14.06, width: 32.20, leadingCut: 0, trailingCut: 2.97 });
			line.optimizeInlines();
			assert.strictEqual(line.inlines[0].x, 0);
			assert.strictEqual(line.inlines[1].x, 42.87); // sum of preceding inline widths minus first inline leadingCut
		});

		it('should set leadingCut to leadingCut of the first optimized inline', function () {
			var line = new Line(1000);
			line.addInline({ text: 'Inline ', fontSize: 12, height: 14.06, width: 31.69, leadingCut: 20, trailingCut: 2.97 });
			line.addInline({ text: 'text ', fontSize: 12, height: 14.06, width: 23.14, leadingCut: 0, trailingCut: 2.97 });
			line.addInline({ text: 'works ', fontSize: 12, height: 14.06, width: 32.20, leadingCut: 10, trailingCut: 2.97 });
			line.optimizeInlines();
			assert.strictEqual(line.inlines[0].leadingCut, 20);
		});

		it('should set trailingCut the trailingCut of the last optimized inline', function () {
			var line = new Line(1000);
			line.addInline({ text: 'Inline ', fontSize: 12, height: 14.06, width: 31.69, leadingCut: 0, trailingCut: 0 });
			line.addInline({ text: 'text ', fontSize: 12, height: 14.06, width: 23.14, leadingCut: 0, trailingCut: 10 });
			line.addInline({ text: 'works ', fontSize: 12, height: 14.06, width: 32.20, leadingCut: 0, trailingCut: 2.97 });
			line.optimizeInlines();
			assert.strictEqual(line.inlines[0].trailingCut, 2.97);
		});

		it('should optimize chunks of inlines with the same style', function () {
			var line = new Line(1000);
			// chunk 0
			line.addInline({ text: 'Bigger', fontSize: 15, height: 17.57, width: 42.87, leadingCut: 0, trailingCut: 0 });
			// chunk 1
			line.addInline({ text: 'Inline ', fontSize: 12, height: 14.06, width: 31.69, leadingCut: 0, trailingCut: 2.97 });
			line.addInline({ text: 'text ', fontSize: 12, height: 14.06, width: 23.14, leadingCut: 0, trailingCut: 2.97 });
			line.addInline({ text: 'works ', fontSize: 12, height: 14.06, width: 32.20, leadingCut: 0, trailingCut: 2.97 });
			// chunk 2
			line.addInline({ text: 'Bigger', fontSize: 15, height: 17.57, width: 42.87, leadingCut: 0, trailingCut: 0 });
			// chunk 3
			line.addInline({ text: 'Inline ', fontSize: 12, height: 14.06, width: 31.69, leadingCut: 0, trailingCut: 2.97 });
			line.addInline({ text: 'text ', fontSize: 12, height: 14.06, width: 23.14, leadingCut: 0, trailingCut: 2.97 });
			// chunk 4
			line.addInline({ text: 'Bigger', fontSize: 15, height: 17.57, width: 42.87, leadingCut: 0, trailingCut: 0 });
			// chunk 5
			line.addInline({ text: 'works ', fontSize: 12, height: 14.06, width: 32.20, leadingCut: 0, trailingCut: 2.97 });
			line.optimizeInlines();
			assert.strictEqual(line.inlines.length, 6);
			assert.strictEqual(line.inlines[1].text, 'Inline text works ');
			assert.strictEqual(line.inlines[3].text, 'Inline text ');
		});
	});
});
