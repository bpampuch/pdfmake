/*global _ */
/*jshint globalstrict:true*/
'use strict';

var assert = require('assert');
var Printer = require('../src/printer.js');
var sinon = require('sinon');
var Pdfkit = require('pdfkit');

describe('Printer', function () {

  var SHORT_SIDE = 1000, LONG_SIDE = 2000;
  var fontDescriptors, printer;

  beforeEach(function() {
    fontDescriptors = {
      Roboto: {
        normal: 'examples/fonts/Roboto-Regular.ttf'
      }
    };
    Pdfkit.prototype.addPage = sinon.spy(Pdfkit.prototype.addPage);

  });

  it('should pass switched width and height to pdfkit if page orientation changes from default portrait to landscape', function () {
    printer = new Printer(fontDescriptors);
    var docDefinition = {
      pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
      content: [
        {
          text: 'Page 1'
        },
        {
          text: 'Page 2',
          pageBreak: 'before',
          pageOrientation: 'landscape'
        }
      ]
    };
    printer.createPdfKitDocument(docDefinition);

    assert(Pdfkit.prototype.addPage.callCount === 2);

    assert(Pdfkit.prototype.addPage.firstCall.calledWith(undefined));
    assert.deepEqual(Pdfkit.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
  });

  it('should pass switched width and height to pdfkit if page orientation changes from portrait to landscape', function () {
    printer = new Printer(fontDescriptors);
    var docDefinition = {
      pageOrientation: 'portrait',
      pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
      content: [
        {
          text: 'Page 1'
        },
        {
          text: 'Page 2',
          pageBreak: 'before',
          pageOrientation: 'landscape'
        }
      ]
    };
    printer.createPdfKitDocument(docDefinition);

    assert(Pdfkit.prototype.addPage.callCount === 2);

    assert(Pdfkit.prototype.addPage.firstCall.calledWith(undefined));
    assert.deepEqual(Pdfkit.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
  });

  it('should pass switched width and height to pdfkit if page orientation changes from landscape to portrait', function () {
    printer = new Printer(fontDescriptors);

    var docDefinition = {
      pageOrientation: 'landscape',
      pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
      content: [
        {
          text: 'Page 1'
        },
        {
          text: 'Page 2',
          pageBreak: 'before',
          pageOrientation: 'portrait'
        },
        {
          text: 'Page 3 still portrait',
          pageBreak: 'before'
        }
      ]
    };
    printer.createPdfKitDocument(docDefinition);

    assert(Pdfkit.prototype.addPage.callCount === 3);

    assert(Pdfkit.prototype.addPage.firstCall.calledWith(undefined));
    assert.deepEqual(Pdfkit.prototype.addPage.secondCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
    assert.deepEqual(Pdfkit.prototype.addPage.thirdCall.args[0].size, [SHORT_SIDE, LONG_SIDE]);
  });


  it('should not switch width and height for pdfkit if page orientation changes from landscape to landscape', function () {
    printer = new Printer(fontDescriptors);
    var docDefinition = {
      pageOrientation: 'portrait',
      pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
      content: [
        {
          text: 'Page 1'
        },
        {
          text: 'Page 2',
          pageBreak: 'before',
          pageOrientation: 'landscape'
        },
        {
          text: 'Page 3 landscape again',
          pageOrientation: 'landscape',
          pageBreak: 'after'
        }
      ]
    };
    printer.createPdfKitDocument(docDefinition);

    assert.equal(Pdfkit.prototype.addPage.callCount, 3);


    assert(Pdfkit.prototype.addPage.firstCall.calledWith(undefined));
    assert.deepEqual(Pdfkit.prototype.addPage.secondCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
    assert.deepEqual(Pdfkit.prototype.addPage.thirdCall.args[0].size, [LONG_SIDE, SHORT_SIDE]);
  });

	it('should print bullet vectors as ellipses', function () {
		printer = new Printer(fontDescriptors);
		var docDefinition = {
			pageOrientation: 'portrait',
			pageSize: { width: SHORT_SIDE, height: LONG_SIDE },
			content: [
				{
					"stack": [
						{
							"ul": [
								{ "text": "item1" },
								{ "text": "item2" }
							]
						}
					]
				}
			]
		};
		Pdfkit.prototype.ellipse = sinon.spy(Pdfkit.prototype.ellipse);

		printer.createPdfKitDocument(docDefinition);

		function assertEllipse(ellipseCallArgs) {
			var firstEllipse = {
				x: ellipseCallArgs[0],
				y: ellipseCallArgs[1],
				r1: ellipseCallArgs[2],
				r2: ellipseCallArgs[3]
			};
			assert(firstEllipse.x !== undefined);
			assert(! isNaN(firstEllipse.x));
			assert(firstEllipse.y !== undefined);
			assert(! isNaN(firstEllipse.y));
			assert(firstEllipse.r1 !== undefined);
			assert(! isNaN(firstEllipse.r1));
			assert(firstEllipse.r2 !== undefined);
			assert(! isNaN(firstEllipse.r2));
		}

		assert.equal(Pdfkit.prototype.ellipse.callCount, 2);

		assertEllipse(Pdfkit.prototype.ellipse.firstCall.args);
		assertEllipse(Pdfkit.prototype.ellipse.secondCall.args);

	});

});
