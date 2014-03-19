var assert = require('assert');

var Line = require('../src/line');
var LayoutBuilder = require('../src/layoutBuilder');
var StyleContextStack = require('../src/styleContextStack');
// var TraversalTracker = require('../src/traversalTracker');

// var TextTools = pdfMake.TextTools;
// var Block = pdfMake.Block;
// var BlockSet = pdfMake.BlockSet;
// var ColumnSet = pdfMake.ColumnSet;


var sampleTestProvider = {
	provideFont: function(familyName, bold, italics) {
		return {
			widthOfString: function(text, size) {
				return text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1);
			},
			lineHeight: function(size) {
				return size;
			},
			ascender: 150,
			decender: -50
		}
	}
};

var emptyTableLayout = {
	hLineWidth: function(i) { return 0; },
	vLineWidth: function(i) { return 0; },
	hLineColor: function(i) { return 'black'; },
	vLineColor: function(i) { return 'black'; },
	paddingLeft: function(i) { return 0; },
	paddingRight: function(i) { return 0; },
	paddingTop: function(i) { return 0; },
	paddingBottom: function(i) { return 0; }
};

describe('LayoutBuilder', function() {
	var builder;

	beforeEach(function() {
		builder = new LayoutBuilder({ width: 400, height: 800 }, { left: 40, right: 40, top: 40, bottom: 40 });
		builder.pages = [];
		builder.context = [ { page: -1, availableWidth: 320, availableHeight: 0 }];
		builder.styleStack = new StyleContextStack();
	});

	describe('processDocument', function() {
		it('should arrange texts one below another', function() {
			var desc = [
				'first paragraph',
				'another paragraph'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert(pages[0].lines[0].y < pages[0].lines[1].y);
			assert.equal(pages[0].lines[0].y + pages[0].lines[0].getHeight(), pages[0].lines[1].y);
		});

		it('should split lines with new-line character (bugfix)', function() {
			var desc = [
				'first paragraph\nhaving two lines',
				'another paragraph'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert(pages[0].lines.length, 3);
		});

		it.skip('should span text into lines if theres not enough horizontal space', function() {
			var desc = [
				'first paragraph',
				'another paragraph, this time a little bit longer though, we want to force this line to be broken into several lines'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].lines.length, 6);
		});

		it('should add new pages when theres not enough space left on current page', function() {
			var desc = [
				'first paragraph',
				'another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].lines.length, 60);
			assert.equal(pages[1].lines.length, 11);
		});

		it('should be able to add more than 1 page if there is not enough space', function() {
			var desc = [
				'first paragraph',
				'another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 3);
			assert.equal(pages[0].lines.length, 60);
			assert.equal(pages[1].lines.length, 60);
			assert.equal(pages[2].lines.length, 21);
		});

		it('should not assume there is enough space left if line boundary is exactly on the page boundary (bugfix)', function() {
			var desc = [
				{
					fontSize: 72,
					stack: [
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 2);
		});

		it('should support named styles', function() {
			var desc = [
				'paragraph',
				{
					text: 'paragraph',
					style: 'header'
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 }});

			assert.equal(pages[0].lines[0].getWidth(), 9*12);
			assert.equal(pages[0].lines[1].getWidth(), 9*70);
		});

		it('should support arrays of inlines (as an alternative to simple strings)', function() {
			var desc = [
				'paragraph',
				{
					text: [
						'paragraph ',
						'nextInline'
					],
					style: 'header'
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 15 }});

			assert.equal(pages.length, 1);
			assert.equal(pages[0].lines.length, 2);
		});

		it('should support inline styling and style overrides', function() {
			var desc = [
				'paragraph',
				{
					text: [
						'paragraph',
						{
							text: 'paragraph',
							fontSize: 4
						},
					],
					style: 'header'
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 }});

			assert.equal(pages[0].lines[0].getWidth(), 9*12);
			assert.equal(pages[0].lines[1].getWidth(), 9*70);
			assert.equal(pages[0].lines[2].getWidth(), 9*4);
		});

		it('should support multiple styles (last property wins)', function() {
			var desc = [
				'paragraph',
				{ text: 'paragraph', style: [ 'header', 'small' ] }
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 }, small: { fontSize: 35 }});

			assert.equal(pages[0].lines[0].getWidth(), 9*12);
			assert.equal(pages[0].lines[1].getWidth(), 9*35);
		});

		it('should support style-overrides', function() {
			var desc = [
				'paragraph',
				{ text: 'paragraph', fontSize: 40 }
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 }});

			assert.equal(pages[0].lines[0].getWidth(), 9*12);
			assert.equal(pages[0].lines[1].getWidth(), 9*40);
		});

		it('style-overrides should take precedence over named styles', function() {
			var desc = [
				'paragraph',
				{ text: 'paragraph', fontSize: 40, style: 'header' }
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 }});

			assert.equal(pages[0].lines[1].getWidth(), 9*40);
		});

		it('should support default style', function() {
			var desc = [
				'text',
				'text2'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { fontSize: 50 });
			assert.equal(pages[0].lines[0].getWidth(), 4 * 50);
		});

		it('should support columns', function() {
			var desc = [
				{
					columns: [
						{
							text: 'column 1'
						},
						{
							text: 'column 2'
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].lines[0].x, 40);
			assert.equal(pages[0].lines[1].x, 200);
		});

		it('should support fixed column widths', function() {
			var desc = [
				{
					columns: [
						{
							text: 'col1',
							width: 100,
						},
						{
							text: 'col2',
							width: 150,
						},
						{
							text: 'col3',
							width: 90,
						}

					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert(pages[0].lines.length, 3);
			assert.equal(pages[0].lines[0].x, 40);
			assert.equal(pages[0].lines[1].x, 40 + 100);
			assert.equal(pages[0].lines[2].x, 40 + 100 + 150);
		});

		it('should support text-only column definitions', function() {
			var desc = [
				{
					columns: [
						'column 1',
						'column 2'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].lines[0].x, 40);
			assert.equal(pages[0].lines[1].x, 200);
		});

		it('column descriptor should support named style inheritance', function() {
			var desc = [
				{
					style: 'header',

					columns: [
						{
							text: 'column 1'
						},
						{
							text: 'column 2'
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 20 }});
			assert.equal(pages[0].lines.length, 2);
			assert.equal(pages[0].lines[0].getWidth(), 8*20);
			assert.equal(pages[0].lines[1].getWidth(), 8*20);
		});

		it('column descriptor should support style overrides', function() {
			var desc = [
				{
					fontSize: 8,

					columns: [
						{
							text: 'column 1'
						},
						{
							text: 'column 2'
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 20 }});
			assert.equal(pages[0].lines.length, 2);
			assert.equal(pages[0].lines[0].getWidth(), 8*8);
		});

		it('should support column gap', function() {
			var desc = [
			{
				fontSize: 8,
				columnGap: 23,
				columns: [
					{ text: 'column 1', width: 100 },
					{ text: 'column 2', width: 100 }
				]
			}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].lines.length, 2);
			assert.equal(pages[0].lines[0].x, 40);
			assert.equal(pages[0].lines[1].x, 40 + 100 + 23);
		});

		it('should support column gap inheritance', function() {
			var desc = [
			{
				fontSize: 8,
				columns: [
					{ text: 'column 1', width: 100 },
					{ text: 'column 2', width: 100 }
				]
			}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { columnGap:25 });
			assert.equal(pages[0].lines[1].x, 40 + 100 + 25);
		});

		it('should support fixed column widths', function() {
			var desc = [
				{
					columns: [
						{
							text: 'col1',
							width: 100,
						},
						{
							text: 'col2',
							width: 150,
						},
						{
							text: 'col3',
							width: 90,
						}

					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert(pages[0].lines.length, 3);
			assert.equal(pages[0].lines[0].x, 40);
			assert.equal(pages[0].lines[1].x, 40 + 100);
			assert.equal(pages[0].lines[2].x, 40 + 100 + 150);
		});

		it('should support auto-width columns', function() {
			var desc = [
				{
					columns: [
						{
							text: 'col1',
							width: 'auto',
						},
						{
							text: 'column',
							width: 'auto',
						},
						{
							text: 'col3',
							width: 'auto',
						}

					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert(pages[0].lines.length, 3);
			assert.equal(pages[0].lines[0].x, 40);
			assert.equal(pages[0].lines[1].x, 40 + 4 * 12);
			assert.equal(pages[0].lines[2].x, 40 + 4 * 12 + 6 * 12);
		});

		it('should support auto-width columns mixed with other types of columns', function() {
			var desc = [
				{
					columns: [
						{
							text: 'col1',
							width: 'auto',
						},
						{
							text: 'column',
							width: 58,
						},
						{
							text: 'column',
							width: '*',
						},
						{
							text: 'column',
							width: '*',
						},
						{
							text: 'col3',
							width: 'auto',
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].lines.length, 5);

			var starWidth = (400-40-40-58-2*4*12)/2;
			assert.equal(pages[0].lines[0].x, 40);
			assert.equal(pages[0].lines[1].x, 40 + 4 * 12);
			assert.equal(pages[0].lines[2].x, 40 + 4 * 12 + 58);
			assert.equal(pages[0].lines[3].x, 40 + 4 * 12 + 58 + starWidth);
			assert.equal(pages[0].lines[4].x, 40 + 4 * 12 + 58 + 2 * starWidth);
		});

		it('should support star columns and divide available width equally between all star columns', function() {
			var desc = [
				{
					columns: [
						{
							text: 'col1',
						},
						{
							text: 'col2',
							width: 50
						},
						{
							text: 'col3',
						}

					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			var pageSpace = 400 - 40 - 40;
			var starWidth = (pageSpace - 50)/2;

			assert(pages[0].lines.length, 3);
			assert.equal(pages[0].lines[0].x, 40);
			assert.equal(pages[0].lines[1].x, 40 + starWidth);
			assert.equal(pages[0].lines[2].x, 40 + starWidth + 50);
		});

		it('should pass column widths to inner elements', function() {
			var desc = [
				{
					fontSize: 8,

					columns: [
						{
							columns: [
								{
									text: 'sample text here, should have maxWidth set to ((400 - 40 - 40 - 50)/2)/2'
								},
								{
									text: 'second column'
								}
							]
						},
						{
							text: 'col2',
							width: 50
						},
						{
							text: 'col3',
						}

					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			// ((pageWidth - margins - fixed_column_width) / 2_columns) / 2_subcolumns
			var maxWidth = (400-40-40-50)/2/2;
			assert.equal(pages[0].lines[0].maxWidth, maxWidth);
		});

		it('should support stack of paragraphs', function() {
			var desc = [
				{
					stack: [
						'paragraph1',
						'paragraph2'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert(pages[0].lines[0].getHeight() > 0);
			assert.equal(pages[0].lines.length, 2);
			assert.equal(pages[0].lines[0].y + pages[0].lines[0].getHeight(), pages[0].lines[1].y);
		});

		it('stack of paragraphs should inherit styles and overriden properties from column descriptors', function() {
			var desc = [
				{
					style: 'header',
					italics: false,
					columns: [
						{
							bold: true,
							stack: [
								'paragraph',
								{ text: 'paragraph2' },
								{ text: 'paragraph3', bold: false }
							]
						},
						'another column',
						{
							text: 'third column'
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {
				header: {
					italics: true,
					fontSize: 50
				}
			});

			assert.equal(pages.length, 1);
			assert.equal(pages[0].lines.length, 5);
			assert.equal(pages[0].lines[0].x, pages[0].lines[1].x);
			assert.equal(pages[0].lines[1].x, pages[0].lines[2].x);

			assert.equal(pages[0].lines[0].y, pages[0].lines[3].y);
			assert.equal(pages[0].lines[0].y, pages[0].lines[4].y);

			assert.equal(pages[0].lines[0].inlines[0].width, 9 * 50 * 1.5);
			assert.equal(pages[0].lines[1].inlines[0].width, 10 * 50 * 1.5);

			assert.equal(pages[0].lines[2].inlines[0].width, 10 * 50);
			assert.equal(pages[0].lines[3].inlines[0].width, 8 * 50);
			assert.equal(pages[0].lines[4].inlines[0].width, 6 * 50);
		});

		it('should support unordered lists', function() {
			var desc = [
				'paragraph',
				{
					ul: [
						'item 1',
						'item 2',
						'item 3'
					]
				}
			]

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].lines.length, 4);
		});

		it('unordered lists should have circles to the left of each element', function() {
			var desc = [
				'paragraph',
				{
					ul: [
						'item 1',
						'item 2',
						'item 3'
					]
				}
			]

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].vectors.length, 3);

			for(var i = 0; i < 3; i++) {
				var circle = pages[0].vectors[i];
				var itemLine = pages[0].lines[i + 1];

				assert(circle.x < itemLine.x);
				assert(circle.y > itemLine.y && circle.y < itemLine.y + itemLine.getHeight());
			}
		});

		it('circle radius for unordered lists should be based on fontSize', function() {
			var desc = [
				{
					fontSize: 10,
					ul: [
						'item 1',
						'item 2',
						'item 3'
					]
				},
				{
					fontSize: 18,
					ul: [
						'item 1',
						'item 2',
						'item 3'
					]
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			// without Math.toFixed an AssertionError occurs: 1.7999999999999998 == 1.8
			assert.equal((pages[0].vectors[3].r1 / pages[0].vectors[0].r1).toFixed(1), (18 / 10).toFixed(1));
		});

		it('unordered lists should support nested lists', function() {
			var desc = [
				{
					fontSize: 10,
					ul: [
						'item 1',
						{
							ul: [
								'subitem 1',
								'subitem 2',
								'subitem 3',
							]
						},
						'item 3'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].vectors.length, 2 + 3);

			// positioning
			assert.equal(pages[0].lines[0].x, pages[0].lines[4].x);
			assert.equal(pages[0].lines[1].x, pages[0].lines[2].x);
			assert(pages[0].lines[0].x < pages[0].lines[1].x);

			// circle positioning
			var circle = pages[0].vectors[1];
			var itemLine = pages[0].lines[1];
			assert(circle.x < itemLine.x);
			assert(circle.y > itemLine.y && circle.y < itemLine.y + itemLine.getHeight());
		});

		it('if there is enough space left on the page for the circle but not enough for the following line of text, circle should be drawn on the next page, together with the text', function() {
			var desc = [
				{
					fontSize: 72,
					stack: [
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
						'paragraph',
					]
				},
				{
					fontSize: 90,
					ul: [
						'line 1'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 2);
			assert.equal(pages[0].vectors.length, 0);
			assert.equal(pages[1].vectors.length, 1);
		});

		it('should support ordered lists', function() {
			var desc = [
				'paragraph',
				{
					ol: [
						'item 1',
						'item 2',
						'item 3'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].lines.length, 4 + 3);
		});

		it('numbers in ordered list should use list style, not item-level style (bugfix)', function() {
			var desc = [
				{
					fontSize: 5,
					ol: [
						{ text: 'item 1', fontSize: 15 },
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].lines.length, 2);
			assert.equal(pages[0].lines[0].inlines[0].fontSize, 15);
			assert.equal(pages[0].lines[1].inlines[0].fontSize, 5);
		});

		it('numbers in ordered lists should be positioned to the left of each item', function() {
			var desc = [
				'paragraph',
				{
					ol: [
						'item 1',
						'item 2',
						'item 3'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].lines.length, 4 + 3);


			for(var i = 0; i < 3; i++) {
				var itemLine = pages[0].lines[1 + 2 * i];
				var numberLine = pages[0].lines[2 + 2 * i];

				assert(numberLine.x < itemLine.x);
				assert(numberLine.x + numberLine.getWidth() <= itemLine.x);
				assert(numberLine.y >= itemLine.y && numberLine.y <= itemLine.y + itemLine.getHeight());
			}
		});

		it('numbers in ordered lists should be positioned to the left of each item also in more complex cases', function() {
			var desc = [
				'paragraph',
				{
					ol: [
						'item 1',
						{ fontSize: 40, text: 'item 2' },
						{ text: [ 'item 3', { text: 'next inline', fontSize: 30 } ] },
						'item 4\nhaving two lines',
						{ text: [ 'item 5', { text: 'next inline\nand next line', fontSize: 30 } ] }
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);

			for(var i = 0; i < 3; i++) {
				var paragraphLine = pages[0].lines[1 + 2 * i];
				var numberLine = pages[0].lines[2 + 2 * i];

				assert(numberLine.x < paragraphLine.x);
				assert(numberLine.x + numberLine.getWidth() <= paragraphLine.x);
			}
		});

		it('numbers in ordered lists should be aligned (vertically) to the bottom of the first line of each item', function() {
			var desc = [
				'paragraph',
				{
					ol: [
						'item 1',
						{ fontSize: 40, text: 'item 2' },
						{ text: [ 'item 3', { text: 'next inline', fontSize: 30 } ] },
						'item 4\nhaving two lines',
						{ text: [ 'item 5', { text: 'next inline\nand next line', fontSize: 30 } ] }
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);

			for(var i = 0; i < 3; i++) {
				var paragraphLine = pages[0].lines[1 + 2 * i];
				var numberLine = pages[0].lines[2 + 2 * i];

				assert.equal(numberLine.y + numberLine.getAscenderHeight(), paragraphLine.y + paragraphLine.getAscenderHeight());
			}
		});

		it('numbers in ordered list should be automatically incremented', function() {
			var desc = [
				{
					ol: [
						'item',
						'item',
						'item',
						'item',
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			for(var i = 0; i < 4; i++) {
				var numberLine = pages[0].lines[1 + 2 * i];

				assert.equal(numberLine.inlines[0].text, (i + 1).toString() + '. ');
			}
		});

		it('numbers in ordered sublist should have indepentend counters', function() {
			var desc = [
				{
					ol: [
						'item 1',
						'item 2',
						{
							ol: [
								'subitem 1',
								'subitem 2',
								'subitem 3',
							]
						},
						'item 3',
						'item 4',
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			// item 2
			assert.equal(pages[0].lines[3].inlines[0].text, '2. ');
			// item 3
			assert.equal(pages[0].lines[3 + 6].inlines[0].text, '3. ');

			// subitem 1
			assert.equal(pages[0].lines[5].inlines[0].text, '1. ');
			// subitem 2
			assert.equal(pages[0].lines[7].inlines[0].text, '2. ');
		});

		it('ordered lists should not add an empty line below the number (bugfix)', function() {
			var desc = [
				{
					ol: [
						'item 1',
						'item 2'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages[0].lines[0].y, 40);
			assert.equal(pages[0].lines[1].y, 40);
			assert.equal(pages[0].lines[2].y, 40 + 12);
		});

		it('should support tables with fixed widths', function() {
			var desc = [
				{
					table: {
						widths: [ 30, 50, 40 ],
						body: [
							['a', 'b', 'c'],
							['aaa', 'bbb', 'ccc'],
						]
					},
					layout: emptyTableLayout
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].lines.length, 6);
			assert.equal(pages[0].lines[0].x, 40);
			assert.equal(pages[0].lines[1].x, 40 + 30);
			assert.equal(pages[0].lines[2].x, 40 + 30 + 50);
			assert.equal(pages[0].lines[3].x, 40);
			assert.equal(pages[0].lines[4].x, 40 + 30);
			assert.equal(pages[0].lines[5].x, 40 + 30 + 50);
			assert.equal(pages[0].lines[0].y, 40);
			assert.equal(pages[0].lines[1].y, 40);
			assert.equal(pages[0].lines[2].y, 40);
			assert.equal(pages[0].lines[3].y, 40 + 12);
			assert.equal(pages[0].lines[4].y, 40 + 12);
			assert.equal(pages[0].lines[5].y, 40 + 12);
		});

		it('should support tables with auto column widths', function() {
			var desc = [
				{
					table: {
						widths: 'auto',
						body: [
							['a', 'b', 'c'],
							['aaa', 'bbb', 'ccc'],
						]
					},
					layout: emptyTableLayout
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].lines.length, 6);
			assert.equal(pages[0].lines[0].x, 40);
			assert.equal(pages[0].lines[1].x, 40 + 3*12);
			assert.equal(pages[0].lines[2].x, 40 + 6*12);
			assert.equal(pages[0].lines[3].x, 40);
			assert.equal(pages[0].lines[4].x, 40 + 3*12);
			assert.equal(pages[0].lines[5].x, 40 + 6*12);
			assert.equal(pages[0].lines[0].y, 40);
			assert.equal(pages[0].lines[1].y, 40);
			assert.equal(pages[0].lines[2].y, 40);
			assert.equal(pages[0].lines[3].y, 40 + 12);
			assert.equal(pages[0].lines[4].y, 40 + 12);
			assert.equal(pages[0].lines[5].y, 40 + 12);
		});

		it('should support tables spanning across pages', function() {
			var desc = [{
				table: {
					widths: 'auto',
					body: []
				},
				layout: emptyTableLayout
			}];

			for(var i = 0; i < 80; i++) {
				desc[0].table.body.push(['a', 'b', 'c']);
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
		});

		it('should support table-cell spanning across pages', function() {
			var desc = [{
				table: {
					widths: 'auto',
					body: []
				},
				layout: emptyTableLayout
			}];

			for(var i = 0; i < 59; i++) {
				desc[0].table.body.push(['a', 'b', 'c']);
			}

			desc[0].table.body.push(['a\nb\nc', 'a\nb\nc', 'a\nb\nc']);

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[1].lines.length, 6);
		});

		it('should not split table headers', function() {
			var desc = [
				{
					stack: []
				},
				{
				table: {
					headerRows: 1,
					widths: 'auto',
					body: [
						['a1\na2', 'b1\nb2', 'c1\nc2'],
						['a', 'b', 'c'],
					]
				},
				layout: emptyTableLayout
			}];

			for(var i = 0; i < 59; i++) {
				desc[0].stack.push('sample line');
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].lines.length, 59);
			assert.equal(pages[1].lines.length, 9);
		});

		it('should not split multi-row headers', function() {
			var desc = [
				{
					stack: []
				},
				{
				table: {
					headerRows: 2,

					widths: 'auto',
					body: [
						['a1', 'b1', 'c1'],
						['a2', 'b2', 'c2'],
						['a', 'b', 'c'],
					]
				},
				layout: emptyTableLayout
			}];

			for(var i = 0; i < 59; i++) {
				desc[0].stack.push('sample line');
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].lines.length, 59);
			assert.equal(pages[1].lines.length, 9);
		});

		it('should repeat table headers', function() {
			var desc = [{
				table: {
					headerRows: 1,
					widths: 'auto',
					body: [
						['h1', 'h2', 'h3'],
					]
				},
				layout: emptyTableLayout
			}];

			for(var i = 0; i < 590; i++) {
				desc[0].table.body.push(['a', 'b', 'c']);
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 10);
			pages.forEach(function(page){
				assert.equal(page.lines[0].inlines[0].text, 'h1');
				assert.equal(page.lines[0].y, 40);
				assert.equal(page.lines[0].x, 40);
			});
		});

		it('should not change x positions of repeated table headers, if context.x has changed (bugfix)', function() {
			var desc = [{
				table: {
					headerRows: 1,
					widths: 'auto',
					body: [
						['h1', 'h2', 'h3'],
						[{ ul: [

						]}, 'b', 'c']
					]
				},
				layout: emptyTableLayout
			}];

			for(var i = 0; i < 100; i++) {
				desc[0].table.body[1][0].ul.push('item');
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].lines[0].x, 40);
			assert(pages[0].lines[4].x > 40);
			assert.equal(pages[1].lines[0].x, 40);
		});

		it('should throw an exception if unrecognized structure is detected', function() {
			assert.throws(
				function() {
					builder.layoutDocument([ { ol: [ 'item', { abc: 'test' }]}], sampleTestProvider);
				}
			);
		});

		it('should support images');
		it('should align image properly');
		it('should break pages if image cannot fit on current page');
		it('should move images drawn inside unbreakable blocks properly to the next page');
		it('should copy image if it\'s inside a repeatable block (ie. table header)');

		describe.skip('TODO', function() {
			//DONE
			it.skip('should support block margins');
			it.skip('should support column spans');
			it.skip('should support row spans');

			it.skip('should support vector lines');
			it.skip('should support vector paths');
			it.skip('should support vector dashed lines');
			it.skip('should support vector line join styles');
			it.skip('should support vector rectangles');
			it.skip('should support vector rounded rectangles');
			it.skip('should support vector polygons');
			it.skip('should support vector winding rules');
			it.skip('should support colors');

			it.skip('should support custom page breaks');
			it.skip('should support custom page breaks inside nested elements');

			// DOING
			it.skip('should support table styling');

			// TODO
			it.skip('should support subtables');
			it.skip('should support subtable headers');
			it.skip('should support tables with percentage column widths');

			it.skip('should support inline margins');
			it.skip('should support padding');
			it.skip('should support border styling');
			it.skip('should support page headers');
			it.skip('should support page footers');
			it.skip('should support subscript');
			it.skip('should support superscript');
			it.skip('should support vertical alignment inside cells');
			it.skip('should support programmatic cell styling');
			it.skip('should support non-breaking-spaces');
			it.skip('should support non-breaking-lines');
			it.skip('should support current page number');
			it.skip('should support page count');
			it.skip('should support images');
			it.skip('should support image scaling');

			it.skip('should support clipping');
			it.skip('should support various page orientations');
			it.skip('should support various page sizes');
			it.skip('should support absolute positioning');
			it.skip('should support text continuations');
			it.skip('should support line-height');
			it.skip('should support programmatic styling');
			it.skip('should support line filling action');
			it.skip('should render lines to pdf in a single call if style is the same');
			it.skip('should support document encryption');
			it.skip('should support document permissions');
			it.skip('should support TOC');
			it.skip('should support in-document-references');
			it.skip('should support uppercase text transforms');
			it.skip('should support lowercase text transforms');
		});
	});
});
