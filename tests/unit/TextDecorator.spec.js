var assert = require('assert');
var sinon = require('sinon');
var TextDecorator = require('../../js/TextDecorator').default;
var Line = require('../../js/Line').default;

describe('TextDecorator', function () {
	var pdfDocument, decorator;

	beforeEach(function () {
		pdfDocument = {};
		['fillColor', 'rect', 'fill', 'save', 'restore', 'clip', 'lineWidth', 'moveTo', 'bezierCurveTo', 'stroke'].forEach(function (method) {
			pdfDocument[method] = sinon.stub().returnsThis();
		});
		pdfDocument.resolveColor = (color, fallback) => color || fallback;
		pdfDocument.providePattern = () => null;
		decorator = new TextDecorator(pdfDocument);
	});

	function createLine(inlines) {
		var line = new Line(500);
		inlines.forEach(function (inline) {
			line.addInline(Object.assign({
				width: 40, height: 24, fontSize: 20, font: { ascender: 800 },
				color: 'black', decoration: 'underline', decorationThickness: 2
			}, inline));
		});
		return line;
	}

	function assertRectangle(callIndex, expected) {
		var args = pdfDocument.rect.getCall(callIndex).args;
		assert.equal(args.length, expected.length);
		args.forEach((value, index) => assert(Math.abs(value - expected[index]) < 1e-10,
			'Rectangle coordinate ' + index + ': expected ' + expected[index] + ', received ' + value));
	}

	describe('drawBackground', function () {
		it('should skip inlines without a background', function () {
			decorator.drawBackground(createLine([{}, {}]), 10, 20);
			sinon.assert.notCalled(pdfDocument.rect);
			sinon.assert.notCalled(pdfDocument.fill);
		});

		it('should draw backgrounds at the inline position using the full line height', function () {
			decorator.drawBackground(createLine([{}, { background: 'yellow', height: 12, width: 30 }]), 10, 20);
			sinon.assert.calledOnceWithExactly(pdfDocument.fillColor, 'yellow');
			assertRectangle(0, [50, 20, 30, 24]);
			sinon.assert.calledOnce(pdfDocument.fill);
		});

		it('should include the justification space before an inline', function () {
			decorator.drawBackground(createLine([{ background: 'yellow', justifyShift: 5 }]), 10, 20);
			assertRectangle(0, [5, 20, 45, 24]);
		});

		it('should use a resolved pattern for the background fill', function () {
			var pattern = [{ name: 'stripes' }, 'red'];
			pdfDocument.providePattern = () => pattern;
			decorator.drawBackground(createLine([{ background: ['stripes', 'red'] }]), 10, 20);
			sinon.assert.calledOnceWithExactly(pdfDocument.fillColor, pattern);
		});
	});

	describe('drawDecorations', function () {
		it('should skip empty lines and undecorated inlines', function () {
			decorator.drawDecorations(createLine([]), 10, 20);
			decorator.drawDecorations(createLine([{ decoration: null }]), 10, 20);
			sinon.assert.notCalled(pdfDocument.save);
			sinon.assert.notCalled(pdfDocument.rect);
		});

		[
			{ decoration: 'underline', y: 38.6 },
			{ decoration: 'overline', y: 21.4 },
			{ decoration: 'lineThrough', y: 31 }
		].forEach(function (testCase) {
			it('should position ' + testCase.decoration + ' relative to the text baseline', function () {
				decorator.drawDecorations(createLine([{ decoration: testCase.decoration }]), 10, 20);
				assertRectangle(0, [10, testCase.y, 40, 2]);
				sinon.assert.calledOnceWithExactly(pdfDocument.fillColor, 'black');
				sinon.assert.callOrder(pdfDocument.save, pdfDocument.rect, pdfDocument.fill, pdfDocument.restore);
			});
		});

		it('should join adjacent inlines with matching decorations', function () {
			decorator.drawDecorations(createLine([{ width: 40 }, { width: 30, justifyShift: 5 }]), 10, 20);
			sinon.assert.calledOnce(pdfDocument.rect);
			assertRectangle(0, [10, 38.6, 75, 2]);
		});

		it('should keep decoration colors separate', function () {
			decorator.drawDecorations(createLine([{ decorationColor: 'red' }, { color: 'blue' }]), 10, 20);
			assert.deepEqual(pdfDocument.fillColor.args, [['red'], ['blue']]);
			assertRectangle(0, [10, 38.6, 40, 2]);
			assertRectangle(1, [50, 38.6, 40, 2]);
		});

		it('should not join decorations across undecorated text', function () {
			decorator.drawDecorations(createLine([{}, { decoration: null, width: 20 }, {}]), 10, 20);
			assert.equal(pdfDocument.rect.callCount, 2);
			assertRectangle(0, [10, 38.6, 40, 2]);
			assertRectangle(1, [70, 38.6, 40, 2]);
		});

		it('should keep different decoration thicknesses separate', function () {
			decorator.drawDecorations(createLine([{ decorationThickness: 1 }, { decorationThickness: 3 }]), 10, 20);
			assertRectangle(0, [10, 39.1, 40, 1]);
			assertRectangle(1, [50, 38.1, 40, 3]);
		});

		it('should support multiple decorations on the same inline', function () {
			decorator.drawDecorations(createLine([{ decoration: ['underline', 'lineThrough'] }]), 10, 20);
			assert.equal(pdfDocument.rect.callCount, 2);
			assertRectangle(0, [10, 38.6, 40, 2]);
			assertRectangle(1, [10, 31, 40, 2]);
		});

		[[30, 20, 10], [10, 30, 20], [10, 20, 30]].forEach(function (sizes) {
			it('should use the largest font metrics in a group ordered ' + sizes.join(', '), function () {
				decorator.drawDecorations(createLine(sizes.map(size => ({ fontSize: size, height: size * 1.2 }))), 10, 20);
				assertRectangle(0, [10, 48.4, 120, 2]);
			});
		});

		it('should derive the default thickness from the font size', function () {
			decorator.drawDecorations(createLine([{ fontSize: 30, height: 36, decorationThickness: undefined }]), 10, 20);
			assertRectangle(0, [10, 48.49, 40, 1.82]);
		});

		it('should draw two parallel strokes for double decorations', function () {
			decorator.drawDecorations(createLine([{ decorationStyle: 'double' }]), 10, 20);
			assert.equal(pdfDocument.rect.callCount, 2);
			assertRectangle(0, [10, 38.6, 40, 1]);
			assertRectangle(1, [10, 41.6, 40, 1]);
		});

		it('should clip dashed decorations to the text width', function () {
			decorator.drawDecorations(createLine([{ width: 13.6, decorationStyle: 'dashed' }]), 10, 20);
			assert.equal(pdfDocument.rect.callCount, 3);
			assertRectangle(0, [10, 39.6, 13.6, 2]);
			assertRectangle(1, [10, 38.6, 3.96, 2]);
			assertRectangle(2, [16.8, 38.6, 3.96, 2]);
			sinon.assert.callOrder(pdfDocument.save, pdfDocument.clip, pdfDocument.fill, pdfDocument.restore);
		});

		it('should space dots according to the decoration thickness', function () {
			decorator.drawDecorations(createLine([{ width: 10, decorationStyle: 'dotted' }]), 10, 20);
			assert.equal(pdfDocument.rect.callCount, 3);
			assertRectangle(0, [10, 39.6, 10, 2]);
			assertRectangle(1, [10, 38.6, 2, 2]);
			assertRectangle(2, [16, 38.6, 2, 2]);
		});

		it('should clip wavy decorations to their width and wave height', function () {
			decorator.drawDecorations(createLine([{ width: 7, decorationStyle: 'wavy' }]), 10, 20);
			assertRectangle(0, [10, 38.6, 7, 2]);
			assert(pdfDocument.bezierCurveTo.callCount > 0);
			sinon.assert.calledOnceWithExactly(pdfDocument.stroke, 'black');
			sinon.assert.callOrder(pdfDocument.save, pdfDocument.clip, pdfDocument.moveTo, pdfDocument.bezierCurveTo, pdfDocument.stroke, pdfDocument.restore);
		});

		[{ position: 'sub', y: 45.6 }, { position: 'sup', y: 23.6 }].forEach(function (testCase) {
			it('should shift decorations with ' + testCase.position + ' text', function () {
				decorator.drawDecorations(createLine([{ [testCase.position]: true }]), 10, 20);
				assertRectangle(0, [10, testCase.y, 40, 2]);
			});
		});

		it('should reject unknown decoration names', function () {
			assert.throws(() => decorator.drawDecorations(createLine([{ decoration: 'invalid' }]), 10, 20), /Unknown decoration : invalid/);
			sinon.assert.notCalled(pdfDocument.save);
		});
	});
});
