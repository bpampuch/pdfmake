var assert = require('assert');
var _ = require('lodash');
var PdfKit = require('pdfkit');

var LayoutBuilder = require('../../src/layoutBuilder');
//var StyleContextStack = require('../../src/styleContextStack');
var FontProvider = require('../../src/fontProvider');
var DocumentContext = require('../../src/documentContext');
var DocMeasure = require('../../src/docMeasure');
var ImageMeasure = require('../../src/imageMeasure');
var sizes = require('../../src/standardPageSizes');

// var TraversalTracker = require('../src/traversalTracker');

describe('Integration Test', function () {
  var size = sizes.A7,
    MARGINS = {top: 40, left: 40, right: 40, bottom: 40};


  function renderPages(docDefinition) {
    docDefinition.images = docDefinition.images || {};
    var fontDescriptors = {
      Roboto: {
        normal: 'tests/fonts/Roboto-Regular.ttf',
        bold: 'tests/fonts/Roboto-Medium.ttf',
        italics: 'tests/fonts/Roboto-Italic.ttf',
        bolditalics: 'tests/fonts/Roboto-Italic.ttf'
      }
    };

    var pageSize = { width: size[0], height: size[1], orientation: 'portrait' };

    var pdfKitDoc = new PdfKit({ size: [ pageSize.width, pageSize.height ], compress: false});
    var builder = new LayoutBuilder(
      pageSize,
      { left: MARGINS.left, right: MARGINS.right, top: MARGINS.top, bottom: MARGINS.bottom },
      new ImageMeasure(pdfKitDoc, docDefinition.images)
    );
    var fontProvider = new FontProvider(fontDescriptors, pdfKitDoc);

    return builder.layoutDocument(
      docDefinition.content,
      fontProvider, docDefinition.styles || {},
      docDefinition.defaultStyle || { fontSize: 12, font: 'Roboto' },
      docDefinition.background,
      docDefinition.header,
      docDefinition.footer,
      docDefinition.images,
      docDefinition.watermark,
      docDefinition.pageBreakBefore
    )

  }


  function getInlineTexts(pages, options) {
    return _.map(pages[options.page].items[options.item].item.inlines, 'text');
  }

  describe('basics', function () {


    it('renders text on page', function () {
      var pages = renderPages({
        content: [
          'First paragraph',
          'Second paragraph on three lines because it is longer'
        ]
      });

      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 0}), ['First ', 'paragraph']);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 1}), ['Second ', 'paragraph ', 'on ']);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 2}), ['three ', 'lines ', 'because ', 'it ', 'is ']);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 3}), ['longer']);
    });
  });

});
