'use strict';

var assert = require('assert');
var sinon = require('sinon');

var PdfKitEngine = require('../js/pdfKitEngine').default;
var Printer = require('../js/printer.js').default;

var PdfKit = PdfKitEngine.getEngineInstance();

describe('Printer', function () {

	var SHORT_SIDE = 1000, LONG_SIDE = 2000;
	var fontDescriptors, printer;

	beforeEach(function () {
		fontDescriptors = {
			Roboto: {
				normal: 'tests/fonts/Roboto-Regular.ttf'
			}
		};
		PdfKit.prototype.addPage = sinon.spy(PdfKit.prototype.addPage);

	});

	it('should print bullet vectors as ellipses', function () {
		printer = new Printer(fontDescriptors);
		var docDefinition = {
			pageOrientation: 'portrait',
			pageSize: {width: SHORT_SIDE, height: LONG_SIDE},
			content: [
				{
					"stack": [
						{
							"ul": [
								{"text": "item1"},
								{"text": "item2"}
							]
						}
					]
				}
			]
		};
		PdfKit.prototype.ellipse = sinon.spy(PdfKit.prototype.ellipse);

		printer.createPdfKitDocument(docDefinition);

		function assertEllipse(ellipseCallArgs) {
			var firstEllipse = {
				x: ellipseCallArgs[0],
				y: ellipseCallArgs[1],
				r1: ellipseCallArgs[2],
				r2: ellipseCallArgs[3]
			};
			assert(firstEllipse.x !== undefined);
			assert(!isNaN(firstEllipse.x));
			assert(firstEllipse.y !== undefined);
			assert(!isNaN(firstEllipse.y));
			assert(firstEllipse.r1 !== undefined);
			assert(!isNaN(firstEllipse.r1));
			assert(firstEllipse.r2 !== undefined);
			assert(!isNaN(firstEllipse.r2));
		}

		assert.equal(PdfKit.prototype.ellipse.callCount, 2);

		assertEllipse(PdfKit.prototype.ellipse.firstCall.args);
		assertEllipse(PdfKit.prototype.ellipse.secondCall.args);

	});

	it('should report progress on each rendered item when a progressCallback is passed', function () {

		printer = new Printer(fontDescriptors);

		var progressCallback = sinon.spy(function (progress) {});

		var docDefinition = {
			pageSize: 'A4',
			content: [
				{
					text: 'Text item 1'
				},
				{
					image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAGAQMAAADNIO3CAAAAA1BMVEUAAN7GEcIJAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB98DBREbA3IZ3d8AAAALSURBVAjXY2BABwAAEgAB74lUpAAAAABJRU5ErkJggg=='
				},
				{
					text: 'Text item 2'
				},
				{
					canvas: [{
							type: 'rect',
							x: 0,
							y: 0,
							w: 310,
							h: 260
						}]
				}]
		};

		printer.createPdfKitDocument(docDefinition, {progressCallback: progressCallback});

		assert(progressCallback.withArgs(0.25).calledOnce);
		assert(progressCallback.withArgs(0.5).calledOnce);
		assert(progressCallback.withArgs(0.75).calledOnce);
		assert(progressCallback.withArgs(1).calledOnce);
	});

	it('should work without a progressCallback', function () {
		printer = new Printer(fontDescriptors);

		var docDefinition = {
			pageSize: 'A4',
			content: [{text: 'Text item 1'}]
		};

		assert.doesNotThrow(function () {
			printer.createPdfKitDocument(docDefinition);
		});
	});

});
