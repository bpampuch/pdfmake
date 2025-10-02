'use strict';

var assert = require('assert');
var sinon = require('sinon');

var Printer = require('../../src/printer');
var PdfKitEngine = require('../../src/pdfKitEngine');
var PdfKit = PdfKitEngine.getEngineInstance();
var LayoutBuilder = require('../../src/layoutBuilder');

describe('Printer – extended cases', function () {
  var fontDescriptors;

  beforeEach(function () {
    fontDescriptors = { Roboto: { normal: 'tests/fonts/Roboto-Regular.ttf' } };
  });

  it('standardizes metadata keys (Title capitalization) & custom property stripping spaces', function () {
    var printer = new Printer(fontDescriptors);
    var docDefinition = {
      info: { title: 'sample', Author: 'MixedCase', 'Custom Property': 'X' },
      content: [{ text: 'Hi' }]
    };
    var pdfDoc = printer.createPdfKitDocument(docDefinition);
    // pdfkit stores processed metadata on pdfDoc.info
    assert.strictEqual(pdfDoc.info.Title, 'sample');
    assert.strictEqual(pdfDoc.info.Author, 'MixedCase');
    assert.strictEqual(pdfDoc.info.CustomProperty, 'X');
  });

  it('applies auto height by shrinking Infinity to actual content height', function () {
    var printer = new Printer(fontDescriptors);
    var docDefinition = {
      pageSize: { width: 300, height: 'auto' },
      content: [ { text: 'Line 1' }, { text: 'Line 2' } ]
    };
    var pdfDoc = printer.createPdfKitDocument(docDefinition);
    // After layout, pdfDoc.options.size[1] should not remain Infinity
    assert(pdfDoc.options.size[1] !== Infinity, 'Expected finite page height');
    assert(pdfDoc.options.size[1] > 0, 'Expected positive page height');
  });

  it('respects compression flag when explicitly set to false', function () {
    var printer = new Printer(fontDescriptors);
    var docDefinition = { compress: false, content: [{ text: 'No compression' }] };
    var pdfDoc = printer.createPdfKitDocument(docDefinition);
    assert.strictEqual(pdfDoc.options.compress, false);
  });

  it('propagates tagged and displayTitle flags', function () {
    var printer = new Printer(fontDescriptors);
    var docDefinition = { tagged: true, displayTitle: true, content: [{ text: 'Tagged doc' }] };
    var pdfDoc = printer.createPdfKitDocument(docDefinition);
    assert.strictEqual(pdfDoc.options.tagged, true);
    assert.strictEqual(pdfDoc.options.displayTitle, true);
  });

  it('passes user/owner passwords and permissions through options', function () {
    var printer = new Printer(fontDescriptors);
    var docDefinition = {
      userPassword: 'user1',
      ownerPassword: 'owner1',
      permissions: { printing: 'highResolution' },
      content: [{ text: 'Secured' }]
    };
    var pdfDoc = printer.createPdfKitDocument(docDefinition);
    assert.strictEqual(pdfDoc.options.userPassword, 'user1');
    assert.strictEqual(pdfDoc.options.ownerPassword, 'owner1');
    assert.deepStrictEqual(pdfDoc.options.permissions.printing, 'highResolution');
  });

  it('creates patterns via pdfkit pattern API when patterns are defined', function () {
    var printer = new Printer(fontDescriptors);
    var patternSpy = sinon.spy(PdfKit.prototype, 'pattern');
    var docDefinition = {
      patterns: {
        diag: { boundingBox: [1,1,4,4], xStep: 3, yStep: 3, pattern: '1 0 m 4 4 l s' }
      },
      content: [{ canvas: [{ type: 'rect', x: 0, y: 0, w: 50, h: 20, color: 'diag' }] }]
    };
    printer.createPdfKitDocument(docDefinition);
    assert(patternSpy.calledOnce, 'Expected pattern to be registered');
    patternSpy.restore();
  });

  it('wraps vertical alignment (beginVerticalAlign/endVerticalAlign) with save/translate/restore calls', function () {
    // Stub layoutDocument to inject synthetic vertical alignment markers directly
    var layoutStub = sinon.stub(LayoutBuilder.prototype, 'layoutDocument').callsFake(function () {
      return [{
        pageSize: { width: 595.28, height: 841.89, orientation: 'portrait' },
        watermark: null,
        items: [
          { type: 'beginVerticalAlign', item: { verticalAlign: 'center', nodeHeight: 100, viewHeight: 40 } },
          { type: 'endVerticalAlign', item: { verticalAlign: 'center' } }
        ]
      }];
    });

    var printer = new Printer(fontDescriptors);
    var saveSpy = sinon.spy(PdfKit.prototype, 'save');
    var translateSpy = sinon.spy(PdfKit.prototype, 'translate');
    var restoreSpy = sinon.spy(PdfKit.prototype, 'restore');
    printer.createPdfKitDocument({ content: [] });
    // Expect save -> translate -> restore
    assert(saveSpy.calledOnce, 'expected single save call');
    assert(translateSpy.calledOnce, 'expected single translate call');
    // translate dy should be -(nodeHeight - viewHeight)/2 = -(100-40)/2 = -30
    var translateArgs = translateSpy.firstCall.args;
    assert.strictEqual(translateArgs[0], 0, 'expected x translate 0');
    assert.strictEqual(translateArgs[1], -30, 'expected y translate -30 for center alignment');
    assert(restoreSpy.calledOnce, 'expected single restore call');
    saveSpy.restore(); translateSpy.restore(); restoreSpy.restore(); layoutStub.restore();
  });

  it('renders watermark when provided (sets opacity, rotates, writes text)', function () {
    var printer = new Printer(fontDescriptors);
    var opacitySpy = sinon.spy(PdfKit.prototype, 'opacity');
    var rotateSpy = sinon.spy(PdfKit.prototype, 'rotate');
    var textSpy = sinon.spy(PdfKit.prototype, 'text');
    var docDefinition = {
      watermark: { text: 'CONFIDENTIAL', color: 'red', opacity: 0.3 },
      content: [{ text: 'Body' }]
    };
    printer.createPdfKitDocument(docDefinition);
    // Expect at least one opacity call with provided opacity
    assert(opacitySpy.calledWith(0.3), 'expected opacity call with 0.3');
    assert(rotateSpy.called, 'expected rotation for watermark');
    // Watermark text should appear at least once
    assert(textSpy.args.some(a => a[0] === 'CONFIDENTIAL'), 'expected watermark text call');
    opacitySpy.restore(); rotateSpy.restore(); textSpy.restore();
  });
});
