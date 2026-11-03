'use strict';

var assert = require('assert');
var sinon = require('sinon');
var PDFDocument = require('pdfkit');
var SVGtoPDF = require('../../../js/3rd-party/svg-to-pdfkit').default;

function useTree(levels, fanOut = 1) {
	var definitions = '<rect id="g0" width="1" height="1"/>';
	for (var i = 1; i <= levels; i++) {
		definitions += '<g id="g' + i + '">' + ('<use href="#g' + (i - 1) + '"/>').repeat(fanOut) + '</g>';
	}
	return '<svg width="100" height="100"><defs>' + definitions + '</defs><use href="#g' + levels + '"/></svg>';
}

describe('SVGtoPDF reference expansion', function () {
	var doc;

	beforeEach(function () {
		doc = new PDFDocument();
		doc.resume();
	});

	afterEach(function () {
		doc.end();
	});

	it('should render nested references', function () {
		var fill = sinon.spy(doc, 'fill');
		SVGtoPDF(doc, useTree(2, 3), 0, 0);
		assert.strictEqual(fill.callCount, 9);
	});

	it('should reject excessive use expansion', function () {
		// Four levels exceed the limit but remain bounded if the guard regresses.
		assert.throws(() => SVGtoPDF(doc, useTree(4, 10), 0, 0), {
			message: 'SVGtoPDF: <use> expansion limit exceeded (20000 elements)'
		});
	});

	it('should allow references at the depth limit', function () {
		assert.doesNotThrow(() => SVGtoPDF(doc, useTree(63), 0, 0));
	});

	it('should reject references beyond the depth limit', function () {
		assert.throws(() => SVGtoPDF(doc, useTree(64), 0, 0), {
			message: 'SVGtoPDF: <use> reference depth limit exceeded (64)'
		});
	});

	it('should preserve inherited colors and positions for shared symbols', function () {
		var fillColor = sinon.spy(doc, 'fillColor');
		var transform = sinon.spy(doc, 'transform');
		var svg = '<svg xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100">' +
			'<defs><symbol id="box"><rect width="2" height="3"/></symbol></defs>' +
			'<use href="#box" x="5" fill="red"/><use xlink:href="#box" x="15" fill="blue"/></svg>';
		SVGtoPDF(doc, svg, 0, 0);
		assert.ok(fillColor.calledWith([255, 0, 0]));
		assert.ok(fillColor.calledWith([0, 0, 255]));
		assert.ok(transform.calledWith(1, 0, 0, 1, 5, 0));
		assert.ok(transform.calledWith(1, 0, 0, 1, 15, 0));
	});

	it('should preserve circular-reference warnings', function () {
		var warningCallback = sinon.spy();
		var svg = '<svg width="100" height="100"><defs><g id="loop"><use href="#loop"/></g></defs><use href="#loop"/></svg>';
		SVGtoPDF(doc, svg, 0, 0, { warningCallback: warningCallback });
		sinon.assert.calledOnceWithExactly(warningCallback, 'SVGtoPDF: loop of circular references for id "loop"');
	});
});
