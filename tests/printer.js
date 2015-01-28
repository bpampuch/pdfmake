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
          pageOrientation: 'landscape'
        }
      ]
    };
    printer.createPdfKitDocument(docDefinition);

    assert(Pdfkit.prototype.addPage.callCount === 2);

    assert(Pdfkit.prototype.addPage.firstCall.calledWith(undefined));
    assert.equal(Pdfkit.prototype.addPage.secondCall.args[0].size[0], LONG_SIDE);
    assert.equal(Pdfkit.prototype.addPage.secondCall.args[0].size[1], SHORT_SIDE);
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
          pageOrientation: 'landscape'
        }
      ]
    };
    printer.createPdfKitDocument(docDefinition);

    assert(Pdfkit.prototype.addPage.callCount === 2);

    assert(Pdfkit.prototype.addPage.firstCall.calledWith(undefined));
    assert.equal(Pdfkit.prototype.addPage.secondCall.args[0].size[0], LONG_SIDE);
    assert.equal(Pdfkit.prototype.addPage.secondCall.args[0].size[1], SHORT_SIDE);
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
    assert.equal(Pdfkit.prototype.addPage.secondCall.args[0].size[0], SHORT_SIDE);
    assert.equal(Pdfkit.prototype.addPage.secondCall.args[0].size[1], LONG_SIDE);
    assert.equal(Pdfkit.prototype.addPage.thirdCall.args[0].size[0], SHORT_SIDE);
    assert.equal(Pdfkit.prototype.addPage.thirdCall.args[0].size[1], LONG_SIDE);
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
          pageOrientation: 'landscape'
        },
        {
          text: 'Page 3 landscape again',
          pageOrientation: 'landscape'
        }
      ]
    };
    printer.createPdfKitDocument(docDefinition);

    console.log('mysterious fourth call arguments', Pdfkit.prototype.addPage.lastCall.args);
    assert.equal(Pdfkit.prototype.addPage.callCount, 3);


    assert(Pdfkit.prototype.addPage.firstCall.calledWith(undefined));
    assert.equal(Pdfkit.prototype.addPage.secondCall.args[0].size[0], LONG_SIDE);
    assert.equal(Pdfkit.prototype.addPage.secondCall.args[0].size[1], SHORT_SIDE);
    assert.equal(Pdfkit.prototype.addPage.thirdCall.args[0].size[0], LONG_SIDE);
    assert.equal(Pdfkit.prototype.addPage.thirdCall.args[0].size[1], SHORT_SIDE);
  });

});