var assert = require('assert');
var _ = require('lodash');
var PdfKit = require('pdfkit');

var LayoutBuilder = require('../src/layoutBuilder');
var FontProvider = require('../src/fontProvider');
var ImageMeasure = require('../src/imageMeasure');
var sizes = require('../src/standardPageSizes');

// var TraversalTracker = require('../src/traversalTracker');

describe('Integration Test', function () {
  var MARGINS = {top: 40, left: 40, right: 40, bottom: 40};
  var LINE_HEIGHT = 14.064;



  function renderPages(sizeName, docDefinition) {
    var size = sizes[sizeName];
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
      var pages = renderPages('A7', {
        content: [
          'First paragraph',
          'Second paragraph on three lines because it is longer'
        ]
      });

      assert.equal(pages.length, 1);
      assert.equal(pages[0].items.length, 4);
      assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'x'), [MARGINS.left, MARGINS.left, MARGINS.left, MARGINS.left]);
      assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'y'), [MARGINS.top, MARGINS.top + LINE_HEIGHT, MARGINS.top + 2 * LINE_HEIGHT, MARGINS.top + 3 * LINE_HEIGHT]);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 0}), ['First ', 'paragraph']);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 1}), ['Second ', 'paragraph ', 'on ']);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 2}), ['three ', 'lines ', 'because ', 'it ', 'is ']);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 3}), ['longer']);
    });
  });

  describe('columns simple', function(){

    var pages;

    beforeEach(function(){
      pages = renderPages('A5', {
        content: [
          {
            alignment: 'justify',
            columns: [
              {
                text: 'Lorem ipsum Malit profecta versatur'
              },
              {
                text: 'and alta adipisicing elit  Malit profecta versatur'
              }
            ]
          },
          {
            columns: [
              {
                text: 'dolor sit amet'
              },
              {
                text: 'Diu concederetur.'
              },
              {
                text: 'dolor sit amet'
              }
            ]
          },
          {
            columns: [
              {
                width: 90,
                text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.'
              },
              {
                width: '*',
                text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.'
              }
            ]
          },
          {
            columns: [
              {
                width: 'auto',
                text: 'auto column'
              },
              {
                width: '*',
                text: 'This is a star-sized column. It should get the remaining space divided by the number of all star-sized columns.'
              },
              {
                width: 50,
                text: 'this one has specific width set to 50'
              }
            ]
          },
          {
            columns: [
              {
                width: 'auto',
                text: 'val1'
              },
              {
                width: 'auto',
                text: 'val2'
              },
              {
                width: 'auto',
                text: 'value3'
              },
              {
                width: 'auto',
                text: 'value 4'
              }
            ]
          },
          {
            columns: [
              {
                width: 100,
                text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.'
              },
              [
                'As you can see in the document definition.\n\n',
                {
                  columns: [
                    { text: 'Lorem ipsum dolor sit amet.' },
                    { text: 'Lorem ipsum dolor sit amet.' },
                    { text: 'Lorem ipsum dolor sit amet.' }
                  ]
                }
              ]
            ]
          }
        ],
        defaultStyle: {
          columnGap: 1
        }
      });
    });

    it('renders two columns', function () {
      var dd = {
        content: [
          {
            alignment: 'justify',
            columns: [
              'Lorem ipsum Malit profecta versatur',
              'and alta adipisicing elit Malit profecta versatur'
            ]
          }
        ],
        defaultStyle: {
          columnGap: 1
        }
      };
      pages = renderPages('A5', dd);

      var columnCount = 2,
          columnSpacing = (sizes.A5[0] + dd.defaultStyle.columnGap) / columnCount;

      assert.equal(pages.length, 1);
      assert.equal(pages[0].items.length, 4);
      assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'x'), [MARGINS.left, MARGINS.left, columnSpacing, columnSpacing]);
      assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'y'), [MARGINS.top, MARGINS.top + LINE_HEIGHT, MARGINS.top, MARGINS.top + LINE_HEIGHT]);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 0}).join(''), 'Lorem ipsum Malit profecta ');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 1}).join(''), 'versatur');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 2}).join(''), 'and alta adipisicing elit Malit ');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 3}).join(''), 'profecta versatur');
    });

    it('renders three columns', function () {
      var dd = {
        content: [
          {
            columns: [
              'dolor sit amet',
              'Diu concederetur.',
              'dolor sit amet'
            ]
          }
        ],
        defaultStyle: {
          columnGap: 1
        }
      };

      pages = renderPages('A5', dd);

      var columnCount = 3,
        columnSpacing = (sizes.A5[0] - (MARGINS.left + MARGINS.right) + dd.defaultStyle.columnGap) / columnCount;


      assert.equal(pages.length, 1);
      assert.equal(pages[0].items.length, 3);
      assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'x'), [MARGINS.left, MARGINS.left + columnSpacing, MARGINS.left + 2 * columnSpacing]);
      assert.deepEqual(_.map(_.map(pages[0].items, 'item'), 'y'), [MARGINS.top, MARGINS.top, MARGINS.top]);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 0}).join(''), 'dolor sit amet');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 1}).join(''), 'Diu concederetur.');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 2}).join(''), 'dolor sit amet');
    });

    it('renders star column', function () {
      var dd = {
        content: [
          {
            columns: [
              {
                width: 90,
                text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.'
              },
              {
                width: '*',
                text: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.'
              }
            ]
          }
        ],
        defaultStyle: {
          columnGap: 1
        }
      };

      pages = renderPages('A5', dd);

      var leftColumnSpacing = MARGINS.left,
          definedWidth = dd.content[0].columns[0].width,
          rightColumnSpacing = MARGINS.left + definedWidth + dd.defaultStyle.columnGap,
          starWidth = sizes.A5[0] - (MARGINS.left + MARGINS.right) - dd.defaultStyle.columnGap - definedWidth;


      assert.equal(pages.length, 1);
      assert.equal(pages[0].items.length, 6);
      var items = _.map(pages[0].items, 'item');
      assert.deepEqual(_.map(items, 'x'), [
        leftColumnSpacing, leftColumnSpacing, leftColumnSpacing, leftColumnSpacing,
        rightColumnSpacing, rightColumnSpacing
      ]);
      assert.deepEqual(_.map(items, 'y'), [
        MARGINS.top, MARGINS.top + LINE_HEIGHT, MARGINS.top + 2*LINE_HEIGHT, MARGINS.top + 3* LINE_HEIGHT,
        MARGINS.top, MARGINS.top + LINE_HEIGHT
      ]);
      assert.deepEqual(_.map(items, 'maxWidth'), [
        definedWidth, definedWidth, definedWidth, definedWidth,
        starWidth, starWidth
      ]);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 0}).join(''), 'Lorem ipsum ');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 1}).join(''), 'dolor sit amet, ');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 2}).join(''), 'consectetur ');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 3}).join(''), 'adipisicing elit.');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 4}).join(''), 'Lorem ipsum dolor sit amet, consectetur ');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 5}).join(''), 'adipisicing elit.');
    });

    it('renders auto column', function () {
      var dd = {
        content: [
          {
            columns: [
              {
                width: 'auto',
                text: 'auto column'
              },
              {
                width: '*',
                text: 'This is a star-sized column. It should get the remaining space divided by the number'
              },
              {
                width: 50,
                text: 'this one'
              }
            ]
          }
        ],
        defaultStyle: {
          columnGap: 1
        }
      };

      pages = renderPages('A5', dd);
      var items = _.map(pages[0].items, 'item');

      var definedWidth = dd.content[0].columns[2].width,
        autoColumnSpacing = MARGINS.left,
        fixedColumnSpacing = sizes.A5[0] - MARGINS.right - definedWidth,
        autoWidth = _.chain(items).take(2).map('maxWidth').max().value(),
        starWidth = sizes.A5[0] - (MARGINS.left + MARGINS.right) - 2 * dd.defaultStyle.columnGap - definedWidth - autoWidth,
        starColumnSpacing = autoColumnSpacing + autoWidth + dd.defaultStyle.columnGap;


      assert.equal(pages.length, 1);
      assert.equal(pages[0].items.length, 5);
      assert.deepEqual(_.map(items, 'x'), [
        autoColumnSpacing, autoColumnSpacing,
        starColumnSpacing, starColumnSpacing,
        fixedColumnSpacing
      ]);
      assert.deepEqual(_.map(items, 'y'), [
        MARGINS.top, MARGINS.top + LINE_HEIGHT,
        MARGINS.top, MARGINS.top + LINE_HEIGHT,
        MARGINS.top
      ]);
      assert.deepEqual(_.map(items, 'maxWidth'), [
        autoWidth, autoWidth,
        starWidth, starWidth,
        definedWidth
      ]);
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 0}).join(''), 'auto ');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 1}).join(''), 'column');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 2}).join(''), 'This is a star-sized column. It should get ');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 3}).join(''), 'the remaining space divided by the number');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 4}).join(''), 'this one');
    });

    it('renders only needed space for auto columns', function () {
      var dd = {
        content: [
          {
            columns: [
              {
                width: 'auto',
                text: 'val'
              },
              {
                width: 'auto',
                text: 'val'
              }
            ]
          }
        ],
        defaultStyle: {
          columnGap: 1
        }
      };

      pages = renderPages('A5', dd);
      var items = _.map(pages[0].items, 'item');

      var autoWidth = _.chain(items).take(2).map('maxWidth').max().value(),
          leftColumnSpacing = MARGINS.left,
          rightColumnSpacing = leftColumnSpacing + autoWidth + dd.defaultStyle.columnGap;

      assert.equal(pages.length, 1);
      assert.equal(pages[0].items.length, 2);
      assert.deepEqual(_.map(items, 'x'), [leftColumnSpacing, rightColumnSpacing]);
      assert.deepEqual(_.map(items, 'y'), [MARGINS.top, MARGINS.top]);

      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 0}).join(''), 'val');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 1}).join(''), 'val');
    });

    it('render nested columns', function () {
      var dd = {
        content: [
          {
            columns: [
              {
                width: 100,
                text: 'Lorem ipsum dolor sit amet'
              },
              {
                  columns: [
                    'Lorem ipsum',
                    'Lorem ipsum',
                    'Lorem ipsum'
                  ]
              }
            ]
          }
        ],
        defaultStyle: {
          columnGap: 1
        }
      };

      pages = renderPages('A5', dd);
      var items = _.map(pages[0].items, 'item');

      var gap = dd.defaultStyle.columnGap;
      var loremIpsumWidth = _.chain(items).takeRight(3).map('maxWidth').max().value(),
        definedWidth = dd.content[0].columns[0].width,
        leftColumnSpacing = MARGINS.left,
        rightColumnSpacing = leftColumnSpacing + definedWidth + gap;

      assert.equal(pages.length, 1);
      assert.equal(pages[0].items.length, 5);
      assert.deepEqual(_.map(items, 'x'), [
        leftColumnSpacing, leftColumnSpacing,
        rightColumnSpacing, rightColumnSpacing + (gap + loremIpsumWidth), rightColumnSpacing + 2 * (gap + loremIpsumWidth)
      ]);
      assert.deepEqual(_.map(items, 'y'), [MARGINS.top, MARGINS.top + LINE_HEIGHT, MARGINS.top, MARGINS.top, MARGINS.top]);

      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 0}).join(''), 'Lorem ipsum ');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 1}).join(''), 'dolor sit amet');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 2}).join(''), 'Lorem ipsum');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 3}).join(''), 'Lorem ipsum');
      assert.deepEqual(getInlineTexts(pages, {page: 0, item: 4}).join(''), 'Lorem ipsum');
    });

  });

});
