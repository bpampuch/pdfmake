var assert = require('assert');
var _ = require('lodash');
var PdfKit = require('pdfkit');

var LayoutBuilder = require('../src/layoutBuilder');
var FontProvider = require('../src/fontProvider');
var ImageMeasure = require('../src/imageMeasure');
var sizes = require('../src/standardPageSizes');

describe('Integration Test', function () {
	var fontProvider;

  var MARGINS = {top: 40, left: 40, right: 40, bottom: 40};
  var LINE_HEIGHT = 14.064;

	var DEFAULT_BULLET_SPACER = '9. ';

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
    fontProvider = new FontProvider(fontDescriptors, pdfKitDoc);

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
      var pages = renderPages('A5', dd);

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

      var pages = renderPages('A5', dd);

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

      var pages = renderPages('A5', dd);

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

      var pages = renderPages('A5', dd);
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

      var pages = renderPages('A5', dd);
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

      var pages = renderPages('A5', dd);
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

	describe('tables simple', function () {
		function getColumnText(lines, options) {
			return _.map(lines[options.cell].item.inlines, 'text').join('');
		}

		function getCells(pages, options) {
			return _.select(pages[options.pageNumber].items, {type: 'line'});
		}

		var TABLE_PADDING_X = 4;
		var TABLE_PADDING_Y = 2;

		var TABLE_BORDER_STRENGTH = 1;
		var TABLE_LINE_HEIGHT = 2 * TABLE_PADDING_X + LINE_HEIGHT;

		var startX = MARGINS.left + TABLE_PADDING_X + TABLE_BORDER_STRENGTH;
		var startY = MARGINS.top + TABLE_PADDING_Y + TABLE_BORDER_STRENGTH;

		it('renders a simple table', function () {
			var dd = {
				content: {
					table: {
						body: [
							['Column 1', 'Column 2'],
							['Value 1', 'Value 2']
						]
					}
				}
			};

			var pages = renderPages('A6', dd);
			var lines = getCells(pages, {pageNumber: 0});

			assert.equal(pages.length, 1);
			assert.equal(lines.length, 4);

			var firstColumnSpacing = startX + (TABLE_PADDING_X) * 2 + TABLE_BORDER_STRENGTH * 1 + lines[0].item.maxWidth;

      assert.deepEqual(_.map(_.map(lines, 'item'), 'x'), [
				startX, firstColumnSpacing,
				startX, firstColumnSpacing]);

			assert.deepEqual(_.map(_.map(lines, 'item'), 'y'), [
				startY, startY,
				MARGINS.top + TABLE_LINE_HEIGHT, MARGINS.top + TABLE_LINE_HEIGHT
			]);

      assert.deepEqual(getColumnText(lines, {cell:  0}), 'Column 1');
      assert.deepEqual(getColumnText(lines, {cell:  1}), 'Column 2');

      assert.deepEqual(getColumnText(lines, {cell:  2}), 'Value 1');
      assert.deepEqual(getColumnText(lines, {cell:  3}), 'Value 2');
		});

		it('renders a table with nested list', function () {
      var dd = {
				content: {
					table: {
						body: [
							['Column 1'],
							[
								{ ul: ['item 1', 'item 2'] }
							]
						]
					}
				}
			};

			var pages = renderPages('A6', dd);
			var lines = getCells(pages, {pageNumber: 0});

			assert.equal(pages.length, 1);
			assert.equal(lines.length, 3);

      var bulletSpacing = fontProvider.fontWrappers['Roboto'].normal.widthOfString(DEFAULT_BULLET_SPACER, 12);

      assert.deepEqual(_.map(_.map(lines, 'item'), 'x'), [
				startX,
				startX + bulletSpacing,
				startX + bulletSpacing
			]);

      assert.deepEqual(_.map(_.map(lines, 'item'), 'y'), [
				startY,
				MARGINS.top + TABLE_LINE_HEIGHT,
				MARGINS.top + TABLE_LINE_HEIGHT + LINE_HEIGHT
			]);

      assert.deepEqual(getColumnText(lines, {cell:  0}), 'Column 1');
      assert.deepEqual(getColumnText(lines, {cell:  1}), 'item 1');
      assert.deepEqual(getColumnText(lines, {cell:  2}), 'item 2');
		});

		it('renders a table with nested table', function () {
      var dd = {
				content: {
					table: {
						body: [
							['Column 1', 'Column 2'],
							[
								{
									table: {
										body: [
											[ 'C1', 'C2']
										]
									}
								},
								'Some Value'
							]
						]
					}
				}
			};

			var pages = renderPages('A6', dd);
			var lines = getCells(pages, {pageNumber: 0});

			assert.equal(pages.length, 1);
			assert.equal(lines.length, 5);

			var firstColumnSpacing = startX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH + lines[0].item.maxWidth;

			var startSubTableX = (startX + TABLE_PADDING_X + TABLE_BORDER_STRENGTH);
			var firstSubColumnSpacing = startSubTableX + (TABLE_PADDING_X) * 2 + TABLE_BORDER_STRENGTH + lines[3].item.maxWidth;

      assert.deepEqual(_.map(_.map(lines, 'item'), 'x'), [
				startX,
				firstColumnSpacing,

				startSubTableX,
				firstSubColumnSpacing,

				firstColumnSpacing
			]);

			assert.deepEqual(_.map(_.map(lines, 'item'), 'y'), [
				startY,
				startY,

				MARGINS.top + TABLE_LINE_HEIGHT + TABLE_PADDING_Y + TABLE_BORDER_STRENGTH,
				MARGINS.top + TABLE_LINE_HEIGHT + TABLE_PADDING_Y + TABLE_BORDER_STRENGTH,

				MARGINS.top + TABLE_LINE_HEIGHT
			]);

      assert.deepEqual(getColumnText(lines, {cell:  0}), 'Column 1');
      assert.deepEqual(getColumnText(lines, {cell:  1}), 'Column 2');

      assert.deepEqual(getColumnText(lines, {cell:  2}), 'C1');
      assert.deepEqual(getColumnText(lines, {cell:  3}), 'C2');

      assert.deepEqual(getColumnText(lines, {cell:  4}), 'Some Value');
		});

		it('renders a simple table with star width', function () {
			var definedWidth = 25;
      var dd = {
				content: {
					table: {
						widths: [definedWidth, '*'],
						body: [
							[ 'C1', 'C2']
						]
					}
				}
			};

			var pages = renderPages('A6', dd);
			var lines = getCells(pages, {pageNumber: 0});

			assert.equal(pages.length, 1);
			assert.equal(lines.length, 2);

			var firstColumnSpacing = startX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH + definedWidth;

      assert.deepEqual(_.map(_.map(lines, 'item'), 'x'), [
				startX,
				firstColumnSpacing
			]);

			assert.deepEqual(_.map(_.map(lines, 'item'), 'y'), [
				startY,
				startY
			]);

      assert.deepEqual(getColumnText(lines, {cell:  0}), 'C1');
      assert.deepEqual(getColumnText(lines, {cell:  1}), 'C2');

			var starWidth = sizes.A6[0] - (MARGINS.left + MARGINS.right) - definedWidth - 4 * TABLE_PADDING_X - 3 * TABLE_BORDER_STRENGTH;
			assert.equal(lines[1].item.maxWidth, starWidth)
		});

		it('renders a simple table with auto width', function () {
			var definedWidth = 25;
      var dd = {
				content: {
					table: {
						widths: [definedWidth, 'auto'],
						body: [
							[ 'C1', 'Column 2']
						]
					}
				}
			};

			var pages = renderPages('A6', dd);
			var lines = getCells(pages, {pageNumber: 0});

			assert.equal(pages.length, 1);
			assert.equal(lines.length, 2);

			var firstColumnSpacing = startX + TABLE_PADDING_X * 2 + TABLE_BORDER_STRENGTH + definedWidth;

      assert.deepEqual(_.map(_.map(lines, 'item'), 'x'), [
				startX,
				firstColumnSpacing
			]);

			assert.deepEqual(_.map(_.map(lines, 'item'), 'y'), [
				startY,
				startY
			]);

      assert.deepEqual(getColumnText(lines, {cell:  0}), 'C1');
      assert.deepEqual(getColumnText(lines, {cell:  1}), 'Column 2');

			var autoWidth = fontProvider.fontWrappers['Roboto'].normal.widthOfString('Column 2', 12);
			assert.equal(lines[1].item.maxWidth, autoWidth)
		});

		it('renders a simple table with colspan', function () {
      var dd = {
				content: {
					table: {
						body: [
							[ { text: 'Column 1 with colspan 2', colSpan: 2 }, { text: 'is not rendered at all' }, { text: 'Column 2'} ]
						]
					}
				}
			};

			var pages = renderPages('A6', dd);
			var lines = getCells(pages, {pageNumber: 0});

			assert.equal(pages.length, 1);
			assert.equal(lines.length, 2);

      assert.deepEqual(_.map(_.map(lines, 'item'), 'x')[0], startX);
			assert.deepEqual(_.map(_.map(lines, 'item'), 'y')[0], startY);

      assert.deepEqual(getColumnText(lines, {cell:  0}), 'Column 1 with colspan 2');
      assert.deepEqual(getColumnText(lines, {cell:  1}), 'Column 2');
		});

		it('renders a simple table with rowspan', function () {
      var dd = {
				content: {
					table: {
						body: [
							[ { text: 'Row 1 with rowspan 2', rowSpan: 2 } ],
							[ { text: 'is not rendered at all' } ],
							[ { text: 'Row 2' } ]
						]
					}
				}
			};

			var pages = renderPages('A6', dd);
			var lines = getCells(pages, {pageNumber: 0});

			assert.equal(pages.length, 1);
			assert.equal(lines.length, 2);

      assert.deepEqual(_.map(_.map(lines, 'item'), 'x')[0], startX);
			assert.deepEqual(_.map(_.map(lines, 'item'), 'y')[0], startY);

      assert.deepEqual(getColumnText(lines, {cell:  0}), 'Row 1 with rowspan 2');
      assert.deepEqual(getColumnText(lines, {cell:  1}), 'Row 2');
		});
	});

	describe('lists', function () {
		function getBulletListLine(pages, options) {
			options.itemNumber = options.itemNumber || 1;

			var bullet = pages[options.pageNumber].items[options.itemNumber * 2 - 1];
			var content = pages[options.pageNumber].items[options.itemNumber * 2 - 2];

      return {
				bullet: bullet && bullet.item,
				content: content && content.item
			}
		}

		function getBulletSpacing(inlines) {
			return fontProvider.fontWrappers['Roboto'].normal.widthOfString(inlines, 12);
		}

		it('renders a ordered list', function () {
			var dd = {
				content: {
					ol: [
						'item 1',
						'item 2',
						'item 3 - Paleo American Apparel forage whatever.'
					]
				}
			};

			var pages = renderPages('A6', dd);

			assert.equal(pages.length, 1);

			var item1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 1});
			assert.equal(_.map(item1.content.inlines, 'text').join(''), 'item 1');
			assert.equal(_.map(item1.bullet.inlines, 'text').join(''), '1. ');

			assert.equal(item1.bullet.x, MARGINS.left);
			assert.equal(item1.content.x, MARGINS.left + getBulletSpacing('1. '));
			assert.equal(item1.bullet.y, MARGINS.top);
			assert.equal(item1.content.y, MARGINS.top);

			var item2 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 2});
			assert.equal(_.map(item2.content.inlines, 'text').join(''), 'item 2');
			assert.equal(_.map(item2.bullet.inlines, 'text').join(''), '2. ');

			assert.equal(item2.bullet.x, MARGINS.left);
			assert.equal(item2.content.x, MARGINS.left + getBulletSpacing('2. '));
			assert.equal(item2.bullet.y, MARGINS.top + LINE_HEIGHT);
			assert.equal(item2.content.y, MARGINS.top + LINE_HEIGHT);

			var item3 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 3});
			assert.equal(_.map(item3.content.inlines, 'text').join(''), 'item 3 - Paleo American Apparel ');
			assert.equal(_.map(item3.bullet.inlines, 'text').join(''), '3. ');

			assert.equal(item3.bullet.x, MARGINS.left);
			assert.equal(item3.content.x, MARGINS.left + getBulletSpacing('3. '));
			assert.equal(item3.bullet.y, MARGINS.top + LINE_HEIGHT * 2);
			assert.equal(item3.content.y, MARGINS.top + LINE_HEIGHT * 2);

			var item4 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 4});
			assert.equal(_.map(item4.content.inlines, 'text').join(''), 'forage whatever.');
			assert.equal(item4.bullet, undefined);

      assert.equal(item4.content.x, MARGINS.left + getBulletSpacing(DEFAULT_BULLET_SPACER));
			assert.equal(item4.content.y, MARGINS.top + LINE_HEIGHT * 3);
		});

		it('renders a ordered list and adapts margin to longest list number', function () {
			var dd = {
				content: {
					ol: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5',
						'item 6',
						'item 7',
						'item 8',
						'item 9',
						'item 10'
					]
				}
			};

			var pages = renderPages('A6', dd);

			assert.equal(pages.length, 1);

			var item1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 1});
			assert.equal(_.map(item1.content.inlines, 'text').join(''), 'item 1');
			assert.equal(_.map(item1.bullet.inlines, 'text').join(''), '1. ');

			assert.equal(item1.bullet.x, MARGINS.left);
			assert.equal(item1.content.x, MARGINS.left + getBulletSpacing('10. '));

			var item10 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 10});
			assert.equal(_.map(item10.content.inlines, 'text').join(''), 'item 10');
			assert.equal(_.map(item10.bullet.inlines, 'text').join(''), '10. ');

			assert.equal(item10.bullet.x, MARGINS.left);
			assert.equal(item10.content.x, MARGINS.left + getBulletSpacing('10. '));
		});

		it('renders a unordered list', function () {
			var dd = {
				content: {
					ul: [
						'item 1',
						'item 2',
						'item 3 - Paleo American Apparel forage whatever.'
					]
				}
			};

			var pages = renderPages('A6', dd);

			assert.equal(pages.length, 1);

			var bulletRadius = 2;
			var bulletMargin = MARGINS.left + bulletRadius;

			var item1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 1});
			assert.equal(_.map(item1.content.inlines, 'text').join(''), 'item 1');
			assert.equal(item1.bullet.type, 'ellipse');

      assert.equal(item1.bullet.x, bulletMargin);
			assert.equal(item1.content.x, MARGINS.left + getBulletSpacing(DEFAULT_BULLET_SPACER));
			assert.equal(item1.content.y, MARGINS.top);

			var item2 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 2});
			assert.equal(_.map(item2.content.inlines, 'text').join(''), 'item 2');
			assert.equal(item2.bullet.type, 'ellipse');

			assert.equal(item2.bullet.x, bulletMargin);
			assert.equal(item2.content.x, MARGINS.left + getBulletSpacing(DEFAULT_BULLET_SPACER));

			var item3 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 3});
			assert.equal(_.map(item3.content.inlines, 'text').join(''), 'item 3 - Paleo American Apparel ');
			assert.equal(item3.bullet.type, 'ellipse');

			assert.equal(item3.bullet.x, bulletMargin);
			assert.equal(item3.content.x, MARGINS.left + getBulletSpacing(DEFAULT_BULLET_SPACER));
			assert.equal(item3.content.y, MARGINS.top + LINE_HEIGHT * 2);

			var item4 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 4});
			assert.equal(_.map(item4.content.inlines, 'text').join(''), 'forage whatever.');
			assert.equal(item4.bullet, undefined);

			assert.equal(item4.content.x, MARGINS.left + getBulletSpacing(DEFAULT_BULLET_SPACER));
			assert.equal(item4.content.y, MARGINS.top + LINE_HEIGHT * 3);
		});

		it('renders a unordered list and keeps constant small margin', function () {
			var dd = {
				content: {
					ul: [
						'item 1',
						'item 2',
						'item 3',
						'item 4',
						'item 5',
						'item 6',
						'item 7',
						'item 8',
						'item 9',
						'item 10'
					]
				}
			};

			var pages = renderPages('A6', dd);

			assert.equal(pages.length, 1);

			var bulletRadius = 2;
			var bulletMargin = MARGINS.left + bulletRadius;

			var item1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 1});
			assert.equal(_.map(item1.content.inlines, 'text').join(''), 'item 1');

			assert.equal(item1.bullet.x, bulletMargin);
			assert.equal(item1.content.x, MARGINS.left + getBulletSpacing(DEFAULT_BULLET_SPACER));

			var item10 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 10});
			assert.equal(_.map(item10.content.inlines, 'text').join(''), 'item 10');

			assert.equal(item10.bullet.x, bulletMargin);
			assert.equal(item10.content.x, MARGINS.left + getBulletSpacing(DEFAULT_BULLET_SPACER));
		});

		it('renders nested lists', function () {
			var dd = {
				content: {
					ol: [
						'item 1',
						[
							'item 2',
							{ ol: [ 'subitem 1', 'subitem 2' ] }
						],
						'item 3'
					]
				}
			};

			var pages = renderPages('A6', dd);

			assert.equal(pages.length, 1);

			var item1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 1});
			assert.equal(_.map(item1.content.inlines, 'text').join(''), 'item 1');
			assert.equal(_.map(item1.bullet.inlines, 'text').join(''), '1. ');

			assert.equal(item1.bullet.x, MARGINS.left);
			assert.equal(item1.content.x, MARGINS.left + getBulletSpacing('1. '));

			var item2 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 2});
			assert.equal(_.map(item2.content.inlines, 'text').join(''), 'item 2');
			assert.equal(_.map(item2.bullet.inlines, 'text').join(''), '2. ');

			var item2BulletSpacing = MARGINS.left + getBulletSpacing('2. ');
			assert.equal(item2.bullet.x, MARGINS.left);
			assert.equal(item2.content.x, item2BulletSpacing);

			var subItem1 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 3});
			assert.equal(_.map(subItem1.content.inlines, 'text').join(''), 'subitem 1');
			assert.equal(_.map(subItem1.bullet.inlines, 'text').join(''), '1. ');

      assert.equal(subItem1.bullet.x, item2BulletSpacing);
			assert.equal(subItem1.content.x, item2BulletSpacing + getBulletSpacing('1. '));
			assert.equal(subItem1.content.y, MARGINS.top + LINE_HEIGHT * 2);

			var subItem2 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 4});
			assert.equal(_.map(subItem2.content.inlines, 'text').join(''), 'subitem 2');
			assert.equal(_.map(subItem2.bullet.inlines, 'text').join(''), '2. ');

			assert.equal(subItem2.bullet.x, item2BulletSpacing);
			assert.equal(subItem2.content.x, item2BulletSpacing + getBulletSpacing('2. '));

			var item3 = getBulletListLine(pages, {pageNumber: 0, itemNumber: 5});
			assert.equal(_.map(item3.content.inlines, 'text').join(''), 'item 3');
			assert.equal(_.map(item3.bullet.inlines, 'text').join(''), '3. ');

			var item3BulletSpacing = MARGINS.left + getBulletSpacing('3. ');
			assert.equal(item3.bullet.x, MARGINS.left);
			assert.equal(item3.content.x, item3BulletSpacing);
			assert.equal(item3.content.y, MARGINS.top + LINE_HEIGHT * 4);
		});

	});
});
