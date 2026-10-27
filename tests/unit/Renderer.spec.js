'use strict';

var assert = require('assert');
var sinon = require('sinon');

var Renderer = require('../../js/Renderer').default;
var TextInlines = require('../../js/TextInlines').default;
var StyleContextStack = require('../../js/StyleContextStack').default;
var Line = require('../../js/Line').default;
var LayoutBuilder = require('../../js/LayoutBuilder').default;

describe('Renderer', function () {
	var pdfDocument, renderer;

	beforeEach(function () {
		pdfDocument = {};
		[
			'lineWidth', 'dash', 'undash', 'lineJoin', 'lineCap', 'moveTo', 'lineTo',
			'rect', 'roundedRect', 'path', 'closePath', 'fillColor', 'strokeColor',
			'fill', 'stroke', 'fillAndStroke', 'save', 'restore', 'addContent', 'clip',
			'opacity', 'fontSize', 'text'
		].forEach(function (method) {
			pdfDocument[method] = sinon.stub().returnsThis();
		});
		pdfDocument.providePattern = () => null;
		pdfDocument.resolveColor = (color, fallback) => color || fallback;
		pdfDocument.provideFont = () => ({
			widthOfString: (text, size) => text.length * size,
			lineHeight: size => size,
			ascender: 800
		});
		renderer = new Renderer(pdfDocument);
	});

	describe('renderVector', function () {
		[
			{ name: 'lines', vector: { type: 'line', x1: 1, y1: 2, x2: 30, y2: 40 }, calls: [['moveTo', [1, 2]], ['lineTo', [30, 40]]] },
			{ name: 'paths', vector: { type: 'path', d: 'M 1 2 L 30 40' }, calls: [['path', ['M 1 2 L 30 40']]] },
			{ name: 'rectangles', vector: { type: 'rect', x: 1, y: 2, w: 30, h: 40 }, calls: [['rect', [1, 2, 30, 40]]] },
			{ name: 'rounded rectangles', vector: { type: 'rect', x: 1, y: 2, w: 30, h: 40, r: 5 }, calls: [['roundedRect', [1, 2, 30, 40, 5]]] }
		].forEach(function (testCase) {
			it('should render vector ' + testCase.name, function () {
				renderer.renderVector(testCase.vector);
				testCase.calls.forEach(function (call) {
					sinon.assert.calledOnceWithExactly(pdfDocument[call[0]], ...call[1]);
				});
				sinon.assert.calledOnce(pdfDocument.stroke);
			});
		});

		it('should close polygons after drawing every edge', function () {
			renderer.renderVector({ type: 'polyline', points: [{ x: 1, y: 2 }, { x: 30, y: 2 }, { x: 15, y: 40 }], closePath: true });
			sinon.assert.calledOnceWithExactly(pdfDocument.moveTo, 1, 2);
			assert.deepEqual(pdfDocument.lineTo.args, [[30, 2], [15, 40]]);
			sinon.assert.calledOnce(pdfDocument.closePath);
			sinon.assert.callOrder(pdfDocument.moveTo, pdfDocument.lineTo, pdfDocument.closePath, pdfDocument.stroke);
		});

		it('should apply dash settings and reset them for the next solid line', function () {
			renderer.renderVector({ type: 'line', x1: 0, y1: 0, x2: 30, y2: 0, dash: { length: 4, space: 2, phase: 1 } });
			sinon.assert.calledOnceWithExactly(pdfDocument.dash, 4, { space: 2, phase: 1 });
			renderer.renderVector({ type: 'line', x1: 0, y1: 5, x2: 30, y2: 5 });
			sinon.assert.calledOnce(pdfDocument.undash);
		});

		['miter', 'round', 'bevel'].forEach(function (join) {
			it('should support the ' + join + ' line join style', function () {
				renderer.renderVector({ type: 'polyline', points: [{ x: 0, y: 0 }, { x: 10, y: 20 }], lineJoin: join });
				sinon.assert.calledOnceWithExactly(pdfDocument.lineJoin, join);
			});
		});

		it('should apply fill and stroke colors, opacity and line width', function () {
			renderer.renderVector({ type: 'rect', x: 0, y: 0, w: 30, h: 40, color: 'red', lineColor: 'blue', fillOpacity: 0.5, strokeOpacity: 0.75, lineWidth: 2 });
			sinon.assert.calledOnceWithExactly(pdfDocument.fillColor, 'red', 0.5);
			sinon.assert.calledOnceWithExactly(pdfDocument.strokeColor, 'blue', 0.75);
			sinon.assert.calledOnceWithExactly(pdfDocument.lineWidth, 2);
			sinon.assert.calledOnce(pdfDocument.fillAndStroke);
			sinon.assert.notCalled(pdfDocument.fill);
			sinon.assert.notCalled(pdfDocument.stroke);
		});
	});

	it('should save and restore the graphics state around a clipping rectangle', function () {
		renderer.beginClip({ x: 10, y: 20, width: 30, height: 40 });
		renderer.endClip();
		sinon.assert.calledOnceWithExactly(pdfDocument.addContent, '10 20 30 40 re');
		sinon.assert.callOrder(pdfDocument.save, pdfDocument.addContent, pdfDocument.clip, pdfDocument.restore);
	});

	it('should resolve forward page and text references and link them to their destination', function () {
		var builder = new LayoutBuilder({ width: 400, height: 800 }, { left: 40, right: 40, top: 40, bottom: 40 });
		var pages = builder.layoutDocument([
			{ pageReference: 'target' },
			{ textReference: 'target' },
			{ text: 'target text', id: 'target', pageBreak: 'before' }
		], pdfDocument, {}, { fontSize: 12 });
		assert.equal(pages.length, 2);
		pages[0].items.forEach(item => renderer.renderLine(item.item, item.item.x, item.item.y));
		assert.equal(pdfDocument.text.firstCall.args[0], '2');
		assert.equal(pdfDocument.text.args.slice(1).map(args => args[0]).join(''), 'target text');
		pdfDocument.text.args.forEach(function (args) {
			assert.equal(args[3].goTo, 'target');
		});
		renderer.renderLine(pages[1].items[0].item, 40, 40);
		assert.equal(pdfDocument.text.args[3][3].destination, 'target');
	});

	['sub', 'sup'].forEach(function (position) {
		it('should reduce font size and shift the baseline for ' + (position === 'sub' ? 'subscript' : 'superscript'), function () {
			var inlines = new TextInlines(pdfDocument).buildInlines([
				{ text: 'x' }, { text: '2', [position]: true }
			], new StyleContextStack({}, { fontSize: 20 })).items;
			var line = new Line(100);
			inlines.forEach(inline => line.addInline(inline));
			renderer.renderLine(line, 10, 50);
			assert.equal(inlines[1].fontSize, 20 * 0.58);
			assert.equal(pdfDocument.text.secondCall.args[0], '2');
			assert.equal(pdfDocument.text.secondCall.args[1], 30);
			var baselineY = 50 + (20 - inlines[1].fontSize) * 0.8;
			var shift = inlines[1].fontSize * (position === 'sub' ? 0.35 : -0.75);
			assert(Math.abs(pdfDocument.text.secondCall.args[2] - (baselineY + shift)) < 1e-10);
		});
	});
});
