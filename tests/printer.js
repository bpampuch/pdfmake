'use strict';

var assert = require('assert');
var sinon = require('sinon');

var PdfKitEngine = require('../js/pdfKitEngine').default;
var Printer = require('../js/printer.js').default;

var PdfKit = PdfKitEngine.getEngineInstance();

describe('Printer', function () {

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

});
