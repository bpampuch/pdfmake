var assert = require('assert');

var pdfMake = require('../src/layout.js');
var Line = pdfMake.Line;
var LayoutBuilder = pdfMake.LayoutBuilder;
var StyleContextStack = pdfMake.StyleContextStack;

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
			}
		}
	}
};

describe('LayoutBuilder', function() {
	var builder;

	beforeEach(function() {
		builder = new LayoutBuilder({ width: 400, height: 800 }, { left: 40, right: 40, top: 40, bottom: 40 });
		builder.pages = [];
		builder.context = [ { page: -1, availableWidth: 320, availableHeight: 0 }];
		builder.styleStack = new StyleContextStack();
	});

	describe('addLine', function() {
		it('should add line to current page if there is enough vertical space left', function() {
			builder.context = [ { page: 0, availableWidth: 320, availableHeight: 720 }];

			for(var i = 0; i < 10; i++) {
				var line = new Line(100);
				line.addInline({width: 40, height: 72});
				builder.addLine(line);
			}

			assert.equal(builder.pages.length, 1);
			assert.equal(builder.pages[0].lines.length, 10);
		});

		it('should subtract line height from availableHeight when adding a line and update current y position', function() {
			builder.context = [ { page: 0, availableWidth: 320, availableHeight: 720, y: 40 } ];

			var line = new Line(100);
			line.addInline({width: 40, height: 72});

			builder.addLine(line);

			assert.equal(builder.context[0].availableHeight, 720 - 72);
			assert.equal(builder.context[0].y, 40 + 72);
		});

		it('should add line to the next page if there was not enough vertical space left on current page', function() {
			builder.context = [ { page: 1, availableWidth: 320, availableHeight: 10, y: 710 } ];

			var line = new Line(100);
			line.addInline({width: 40, height: 72});

			builder.addLine(line);

			assert.equal(builder.pages.length, 3);
			assert.equal(builder.context[0].availableHeight, 720 - 72);
			assert.equal(builder.context[0].y, 40 + 72);
			assert.equal(builder.context[0].page, 2);
		});
	});

	describe('buildColumnWidths', function() {
		it('should set calcWidth to specified width for fixed columns', function() {
			var columns = [ 
				{ width: 50, _minWidth: 30, _maxWidth: 80 },
				{ width: 35, _minWidth: 30, _maxWidth: 80 },
				{ width: 20, _minWidth: 30, _maxWidth: 80 }
			];

			builder.buildColumnWidths(columns);

			columns.forEach(function(col) {
				assert.equal(col._calcWidth, col.width);
			});
		});

		it('should set calcWidth to minWidth for fixed columns with elasticWidth set to true', function() {
			var columns = [ 
				{ width: 50, _minWidth: 30, _maxWidth: 80 },
				{ width: 35, _minWidth: 30, _maxWidth: 80 },
				{ width: 20, _minWidth: 30, _maxWidth: 80, elasticWidth: true }
			];

			builder.buildColumnWidths(columns);

			assert.equal(columns[0]._calcWidth, columns[0].width);
			assert.equal(columns[1]._calcWidth, columns[1].width);
			assert.equal(columns[2]._calcWidth, columns[2]._minWidth);
		});

		it('should set auto to maxWidth if there is enough space for all columns', function() {
			var columns = [ 
				{ width: 'auto', _minWidth: 30, _maxWidth: 41 },
				{ width: 'auto', _minWidth: 30, _maxWidth: 42 },
				{ width: 'auto', _minWidth: 30, _maxWidth: 43 }
			];

			builder.buildColumnWidths(columns);

			columns.forEach(function(col) {
				assert.equal(col._calcWidth, col._maxWidth);
			});
		});

		it('should equally divide availableSpace to star columns', function() {
			var columns = [ 
				{ width: '*', _minWidth: 30, _maxWidth: 41 },
				{ width: 'star', _minWidth: 30, _maxWidth: 42 },
				{ _minWidth: 30, _maxWidth: 43 }
			];

			builder.buildColumnWidths(columns);

			columns.forEach(function(col) {
				assert.equal(col._calcWidth, 320/3);
			});
		});

		it('should set calcWidth to minWidth if there is not enough space for the table', function() {
			var columns = [ 
				{ width: 'auto', _minWidth: 300, _maxWidth: 410 },
				{ width: 'auto', _minWidth: 301, _maxWidth: 420 },
				{ width: 'auto', _minWidth: 303, _maxWidth: 421 },
			];

			builder.buildColumnWidths(columns);

			columns.forEach(function(col) {
				assert.equal(col._calcWidth, col._minWidth);
			});
		});

		it('should set calcWidth of star columns to largest star min-width if there is not enough space for the table', function() {
			var columns = [ 
				{ width: 'auto', _minWidth: 300, _maxWidth: 410 },
				{ width: '*', _minWidth: 301, _maxWidth: 420 },
				{ width: 'star', _minWidth: 303, _maxWidth: 421 },
			];

			builder.buildColumnWidths(columns);
			assert.equal(columns[0]._calcWidth, columns[0]._minWidth);
			assert.equal(columns[1]._calcWidth, 303);
			assert.equal(columns[2]._calcWidth, 303);
		});

		it('should make columns wider proportionally if table can fit within the available space', function() {
			var columns = [ 
				{ width: 'auto', _minWidth: 30, _maxWidth: 41 },
				{ width: 'auto', _minWidth: 31, _maxWidth: 42 },
				{ width: 'auto', _minWidth: 33, _maxWidth: 421 },
			];

			builder.buildColumnWidths(columns);
			assert(columns[0]._calcWidth > 30);
			assert(columns[1]._calcWidth > 31);
			assert(columns[2]._calcWidth > 220);
		});

		it('should first take into account auto columns and then divide remaining space equally between all star if there is enough space for the table', function() {
			var columns = [ 
				{ width: '*', _minWidth: 30, _maxWidth: 41 },
				{ width: 'auto', _minWidth: 31, _maxWidth: 42 },
				{ width: '*', _minWidth: 33, _maxWidth: 421 },
			];

			builder.buildColumnWidths(columns);
			assert(columns[1]._calcWidth > 31);
			assert.equal(columns[0]._calcWidth, columns[0]._calcWidth);
			assert.equal(columns[0]._calcWidth + columns[1]._calcWidth + columns[2]._calcWidth, 320);
		});
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

		it('should span text into lines if theres not enough horizontal space', function() {
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
/*

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
			assert.equal(pages[0].blocks.length, 4);
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
				var paragraphBlock = pages[0].blocks[i + 1];

				assert(circle.x < paragraphBlock.x);
				assert(circle.y > paragraphBlock.y && circle.y < paragraphBlock.y + paragraphBlock.getHeight());
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
			// without Math.round we get AssertionError: 1.7999999999999998 == 1.8
			assert.equal(Math.round(pages[0].vectors[3].r1 / pages[0].vectors[0].r1), Math.round(18 / 10));
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
			assert.equal(pages[0].blocks[0].x, pages[0].blocks[4].x);
			assert.equal(pages[0].blocks[1].x, pages[0].blocks[2].x);
			assert(pages[0].blocks[0].x < pages[0].blocks[1].x);

			// circle positioning
			var circle = pages[0].vectors[1];
			var paragraphBlock = pages[0].blocks[1];
			assert(circle.x < paragraphBlock.x);
			assert(circle.y > paragraphBlock.y && circle.y < paragraphBlock.y + paragraphBlock.getHeight());
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

//		it('unordered lists should align broken lines properly', function)

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
			assert.equal(pages[0].blocks.length, 4 + 3);
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
			assert.equal(pages[0].blocks.length, 2);
			assert.equal(pages[0].blocks[0].lines[0].inlines[0].fontSize, 15);
			assert.equal(pages[0].blocks[1].lines[0].inlines[0].fontSize, 5);
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
			assert.equal(pages[0].blocks.length, 4 + 3);


			for(var i = 0; i < 3; i++) {
				var paragraphBlock = pages[0].blocks[1 + 2 * i];
				var numberBlock = pages[0].blocks[2 + 2 * i];
				
				assert(numberBlock.x < paragraphBlock.x);
				assert(numberBlock.x + numberBlock.getWidth() <= paragraphBlock.x);
				assert(numberBlock.y >= paragraphBlock.y && numberBlock.y <= paragraphBlock.y + paragraphBlock.getHeight());
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
				var paragraphBlock = pages[0].blocks[1 + 2 * i];
				var numberBlock = pages[0].blocks[2 + 2 * i];
				
				assert(numberBlock.x < paragraphBlock.x);
				assert(numberBlock.x + numberBlock.getWidth() <= paragraphBlock.x);
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
				var paragraphBlock = pages[0].blocks[1 + 2 * i];
				var numberBlock = pages[0].blocks[2 + 2 * i];

				assert.equal(numberBlock.y + numberBlock.getHeight(), paragraphBlock.y + paragraphBlock.lines[0].getHeight());
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
				var numberBlock = pages[0].blocks[1 + 2 * i];

				assert.equal(numberBlock.lines[0].inlines[0].text, (i + 1).toString() + '.');
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
			assert.equal(pages[0].blocks[3].lines[0].inlines[0].text, '2.');
			// item 3
			assert.equal(pages[0].blocks[3 + 6].lines[0].inlines[0].text, '3.');

			// subitem 1
			assert.equal(pages[0].blocks[5].lines[0].inlines[0].text, '1.');
			// subitem 2
			assert.equal(pages[0].blocks[7].lines[0].inlines[0].text, '2.');
		});
//		it('should support line indents', function() {
//		//	assert.fail();
//		});
describe('processColumns', function() {
		var startPosition;

		beforeEach(function() {
			startPosition = {
				page: 0, 
				x: builder.pageMargins.left, 
				y: builder.pageMargins.top, 
				availableWidth: builder.pageSize.width - builder.pageMargins.left - builder.pageMargins.right
			};

			builder.pages = [];
			builder.styleStack = new StyleContextStack(builder.styleDictionary, builder.defaultStyle);
			builder.blockTracker = new BlockSet();
		});

		it('should convert text columns to column objects', function() {
			builder._processNode = function(node, position) { return position; };

			var columns = [ { text: 'aaa' }, 'bbb', 'ccc', { text: 'ddd'} ];
			builder._processColumns(columns, startPosition);

			assert(columns[1].text);
			assert(columns[2].text);
			assert.equal(columns[0].text, 'aaa');
			assert.equal(columns[1].text, 'bbb');
		});

		it('should use ColumnSet for column width management', function() {
			var blocks = [];

			builder._processNode = function(node, position) { 
				var block = { x: 40, y: 0, getWidth: function() { return 75; } };
				blocks.push(block);

				builder.onBlockAdded(0, builder.pages[0], block);
				return position; 
			};

			var columns = [
				{ width: 90 },
				{ width: 'auto' },
				{ width: 70 },
				{ },
			];

			builder._processColumns(columns, startPosition);

			assert.equal(blocks.length, 4);

			// availableWidth = 400-40-40 = 320
			// autoColumnWidth = 75
			// starColumnWidth = 320-90-70-75 = 85
			// block order (block<->column mapping): 0, 2, 1, 3
			assert.equal(blocks[0].x, 40);
			assert.equal(blocks[2].x, 40 + 90);
			assert.equal(blocks[1].x, 40 + 90 + 75);
			assert.equal(blocks[3].x, 40 + 90 + 75 + 70);
		});
	});
*/
		describe.skip('TODO', function() {
			it('should support tables with fixed column widths');
			it('should support tables with auto column widths');
			it('should support tables with percentage column widths');
			it('should support table headers');
			it('should support table splitting between pages and repeat table headers');
			it('should support table-cell splitting between pages');

			it('should support block margins');
			it('should support inline margins');
			it('should support page headers');
			it('should support page footers');
			it('should support subscript');
			it('should support superscript');
			it('should support subtables created from arrays');
			it('should support subtables created from another table');
			it('should support vertical alignment inside cells');
			it('should support table styling');
			it('should support column spans');
			it('should support row spans');
			it('should support programmatic cell styling');
			it('should support multiline content in table cells');
			it('should support non-breaking-spaces');
			it('should support non-breaking-lines');
			it('should support current page number');
			it('should support page count');
			it('should support custom page breaks');
			it('should support custom page breaks inside nested elements');
			it('should support images');
			it('should support image scaling');
			it('should support vector lines');
			it('should support vector paths');
			it('should support vector dashed lines');
			it('should support vector line join styles');
			it('should support vector rectangles');
			it('should support vector rounded rectangles');
			it('should support vector polygons');
			it('should support vector winding rules');
			it('should support clipping');
			it('should support various page orientations');
			it('should support various page sizes');
			it('should support border styling');
			it('should support padding');
			it('should support colors');
			it('should support absolute positioning');
			it('should support text continuations');
			it('should support line-height');
			it('should support programmatic styling');
			it('should support line filling action');
			it('should render lines to pdf in a single call if style is the same');
			it('should support document encryption');
			it('should support document permissions');
			it('should support TOC');
			it('should support in-document-references');
			it('should support uppercase text transforms');
			it('should support lowercase text transforms');
		});
	}); 
});