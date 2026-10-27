'use strict';

var assert = require('assert');
var sinon = require('sinon');

var LayoutBuilder = require('../../js/LayoutBuilder').default;
var StyleContextStack = require('../../js/StyleContextStack').default;
var ColumnCalculator = require('../../js/columnCalculator').default;
var PageElementWriter = require('../../js/PageElementWriter').default;
var DocumentContext = require('../../js/DocumentContext').default;
var DocMeasure = require('../../js/DocMeasure').default;

// var TextInlines = pdfMake.TextInlines;
// var Block = pdfMake.Block;
// var BlockSet = pdfMake.BlockSet;
// var ColumnSet = pdfMake.ColumnSet;


function isArray(variable) {
	return Array.isArray(variable);
}

function isObject(variable) {
	return variable !== null && typeof variable === 'object';
}

function toString(variable) {
	if (variable === undefined) {
		return 'undefined';
	} else if (variable === null) {
		return 'null';
	} else {
		return variable.toString();
	}
}

var sampleTestProvider = {
	images: {},
	provideFont: function (familyName, bold, italics) {
		return {
			widthOfString: function (text, size) {
				return text.length * size * (bold ? 1.5 : 1) * (italics ? 1.1 : 1);
			},
			lineHeight: function (size) {
				return size;
			},
			ascender: 150,
			descender: -50
		};
	},
	provideImage(src) { // eslint-disable-line no-unused-vars
		return {
			width: 1,
			height: 1
		};
	}
};

var emptyTableLayout = {
	hLineWidth: function (i) { // eslint-disable-line no-unused-vars
		return 0;
	},
	vLineWidth: function (i) { // eslint-disable-line no-unused-vars
		return 0;
	},
	hLineColor: function (i) { // eslint-disable-line no-unused-vars
		return 'black';
	},
	vLineColor: function (i) { // eslint-disable-line no-unused-vars
		return 'black';
	},
	hLineStyle: function (i, node) { // eslint-disable-line no-unused-vars
		return null;
	},
	vLineStyle: function (i, node) { // eslint-disable-line no-unused-vars
		return null;
	},
	paddingLeft: function (i) { // eslint-disable-line no-unused-vars
		return 0;
	},
	paddingRight: function (i) { // eslint-disable-line no-unused-vars
		return 0;
	},
	paddingTop: function (i) { // eslint-disable-line no-unused-vars
		return 0;
	},
	paddingBottom: function (i) { // eslint-disable-line no-unused-vars
		return 0;
	}
};

describe('LayoutBuilder', function () {
	var builder;

	beforeEach(function () {
		builder = new LayoutBuilder({ width: 400, height: 800, orientation: 'portrait' }, { left: 40, right: 40, top: 40, bottom: 40 });
		builder.pages = [];
		builder.context = [{ page: -1, availableWidth: 320, availableHeight: 0 }];
		builder.styleStack = new StyleContextStack();
	});

	describe('processDocument', function () {
		it('should arrange texts one below another', function () {
			var desc = [
				'first paragraph',
				'another paragraph'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert(pages[0].items[0].item.y < pages[0].items[1].item.y);
			assert.equal(pages[0].items[0].item.y + pages[0].items[0].item.getHeight(), pages[0].items[1].item.y);
		});

		it('should support text in nested object', function () {
			var desc = [{
				text: {
					text: {
						text: 'hello, world'
					}
				}
			}];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 1);
			assert.equal(pages[0].items[0].item.inlines.length, 2);
			assert.equal(pages[0].items[0].item.inlines[0].text, 'hello, ');
			assert.equal(pages[0].items[0].item.inlines[1].text, 'world');
		});

		it('should split lines with new-line character (bugfix)', function () {
			var desc = [
				'first paragraph\nhaving two lines',
				'another paragraph'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert(pages[0].items.length, 3);
		});

		it('should span text into lines if theres not enough horizontal space', function () {
			var desc = [
				'first paragraph',
				'another paragraph, this time a little bit longer though, we want to force this line to be broken into several lines'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 6);
		});

		it('should respect maxHeight', function () {
			var desc = [{
				text: 'another paragraph, this time a little bit longer though, we want to force this line to be broken into several lines',
				maxHeight: 15
			}];
			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 1);
		});

		it('should add new pages when theres not enough space left on current page', function () {
			var desc = [
				'first paragraph',
				'another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 60);
			assert.equal(pages[1].items.length, 11);
		});

		it('should be able to add more than 1 page if there is not enough space', function () {
			var desc = [
				'first paragraph',
				'another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 3);
			assert.equal(pages[0].items.length, 60);
			assert.equal(pages[1].items.length, 60);
			assert.equal(pages[2].items.length, 21);
		});

		it('should not assume there is enough space left if line boundary is exactly on the page boundary (bugfix)', function () {
			var desc = [
				{
					fontSize: 72,
					stack: [
						{ text: 'paragraph', noWrap: true },
						{ text: 'paragraph', noWrap: true },
						{ text: 'paragraph', noWrap: true },
						{ text: 'paragraph', noWrap: true },
						{ text: 'paragraph', noWrap: true },
						{ text: 'paragraph', noWrap: true },
						{ text: 'paragraph', noWrap: true },
						{ text: 'paragraph', noWrap: true },
						{ text: 'paragraph', noWrap: true },
						{ text: 'paragraph', noWrap: true },
						{ text: 'paragraph', noWrap: true }
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 2);
		});

		it('should support named styles', function () {
			var desc = [
				'paragraph',
				{
					text: 'paragraph',
					style: 'header',
					noWrap: true
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

			assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
			assert.equal(pages[0].items[1].item.getWidth(), 9 * 70);
		});

		it('should support arrays of inlines (as an alternative to simple strings)', function () {
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

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 15 } });

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 2);
		});

		it('should support inline text in nested arrays', function () {
			var desc = [{
				text: [
					{ text: 'a better ' },
					{ text: [{ text: 'style ' }] },
					{ text: 'independently ' }
				]
			}];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { fontSize: 8 });

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 1);
			assert.equal(pages[0].items[0].item.inlines.length, 4);
			assert.equal(pages[0].items[0].item.inlines[0].text, 'a ');
			assert.equal(pages[0].items[0].item.inlines[1].text, 'better ');
			assert.equal(pages[0].items[0].item.inlines[2].text, 'style ');
			assert.equal(pages[0].items[0].item.inlines[3].text, 'independently ');
		});

		it('should support inline styling and style overrides', function () {
			var desc = [
				'paragraph',
				{
					text: [
						{ text: 'paragraph', noWrap: true },
						{
							text: ' paragraph',
							fontSize: 4
						}
					],
					style: 'header'
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

			assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
			assert.equal(pages[0].items[1].item.getWidth(), 9 * 70);
			assert.equal(pages[0].items[2].item.getWidth(), 9 * 4);
		});

		it('should support multiple styles (last property wins)', function () {
			var desc = [
				'paragraph',
				{ text: 'paragraph', style: ['header', 'small'] }
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 }, small: { fontSize: 35 } });

			assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
			assert.equal(pages[0].items[1].item.getWidth(), 9 * 35);
		});

		it('should support style-overrides', function () {
			var desc = [
				'paragraph',
				{ text: 'paragraph', fontSize: 40, noWrap: true }
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

			assert.equal(pages[0].items[0].item.getWidth(), 9 * 12);
			assert.equal(pages[0].items[1].item.getWidth(), 9 * 40);
		});

		it('style-overrides should take precedence over named styles', function () {
			var desc = [
				'paragraph',
				{ text: 'paragraph', fontSize: 40, style: 'header', noWrap: true }
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 70 } });

			assert.equal(pages[0].items[1].item.getWidth(), 9 * 40);
		});

		it('should support default style', function () {
			var desc = [
				'text',
				'text2'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { fontSize: 50 });
			assert.equal(pages[0].items[0].item.getWidth(), 4 * 50);
		});

		it('should support columns', function () {
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
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 200);
		});

		it('should support fixed column widths', function () {
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
			assert(pages[0].items.length, 3);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 100);
			assert.equal(pages[0].items[2].item.x, 40 + 100 + 150);
		});

		it('should support text-only column definitions', function () {
			var desc = [
				{
					columns: [
						'column 1',
						'column 2'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 200);
		});

		it('column descriptor should support named style inheritance', function () {
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

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 20 } });
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.getWidth(), 8 * 20);
			assert.equal(pages[0].items[1].item.getWidth(), 8 * 20);
		});

		it('column descriptor should support style overrides', function () {
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

			var pages = builder.layoutDocument(desc, sampleTestProvider, { header: { fontSize: 20 } });
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.getWidth(), 8 * 8);
		});

		it('should support column gap', function () {
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
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 100 + 23);
		});

		it('should support column gap inheritance', function () {
			var desc = [
				{
					fontSize: 8,
					columns: [
						{ text: 'column 1', width: 100 },
						{ text: 'column 2', width: 100 }
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {}, { columnGap: 25 });
			assert.equal(pages[0].items[1].item.x, 40 + 100 + 25);
		});

		it('should support fixed column widths', function () {
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
			assert(pages[0].items.length, 3);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 100);
			assert.equal(pages[0].items[2].item.x, 40 + 100 + 150);
		});

		it('should support auto-width columns', function () {
			var desc = [
				{
					columns: [
						{
							text: 'col1',
							width: 'auto',
							noWrap: true
						},
						{
							text: 'column',
							width: 'auto',
							noWrap: true
						},
						{
							text: 'col3',
							width: 'auto',
							noWrap: true
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert(pages[0].items.length, 3);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 4 * 12);
			assert.equal(pages[0].items[2].item.x, 40 + 4 * 12 + 6 * 12);
		});

		it('should support auto-width columns mixed with other types of columns', function () {
			var desc = [
				{
					columns: [
						{
							text: 'col1',
							width: 'auto',
							noWrap: true
						},
						{
							text: 'column',
							width: 58,
							noWrap: true
						},
						{
							text: 'column',
							width: '*',
							noWrap: true
						},
						{
							text: 'column',
							width: '*',
							noWrap: true
						},
						{
							text: 'col3',
							width: 'auto',
							noWrap: true
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 5);

			var starWidth = (400 - 40 - 40 - 58 - 2 * 4 * 12) / 2;
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 4 * 12);
			assert.equal(pages[0].items[2].item.x, 40 + 4 * 12 + 58);
			assert.equal(pages[0].items[3].item.x, 40 + 4 * 12 + 58 + starWidth);
			assert.equal(pages[0].items[4].item.x, 40 + 4 * 12 + 58 + 2 * starWidth);
		});

		it('should support star columns and divide available width equally between all star columns', function () {
			var desc = [
				{
					columns: [
						{
							text: 'col1'
						},
						{
							text: 'col2',
							width: 50
						},
						{
							text: 'col3'
						}

					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			var pageSpace = 400 - 40 - 40;
			var starWidth = (pageSpace - 50) / 2;

			assert(pages[0].items.length, 3);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + starWidth);
			assert.equal(pages[0].items[2].item.x, 40 + starWidth + 50);
		});

		it('should pass column widths to inner elements', function () {
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
							text: 'col3'
						}

					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			// ((pageWidth - margins - fixed_column_width) / 2_columns) / 2_subcolumns
			var maxWidth = (400 - 40 - 40 - 50) / 2 / 2;
			assert.equal(pages[0].items[0].item.maxWidth, maxWidth);
		});

		it('should support stack of paragraphs', function () {
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
			assert(pages[0].items[0].item.getHeight() > 0);
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.y + pages[0].items[0].item.getHeight(), pages[0].items[1].item.y);
		});

		it('stack of paragraphs should inherit styles and overridden properties from column descriptors', function () {
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
			assert.equal(pages[0].items.length, 5);
			assert.equal(pages[0].items[0].item.x, pages[0].items[1].item.x);
			assert.equal(pages[0].items[1].item.x, pages[0].items[2].item.x);

			assert.equal(pages[0].items[0].item.y, pages[0].items[3].item.y);
			assert.equal(pages[0].items[0].item.y, pages[0].items[4].item.y);

			assert.equal(pages[0].items[0].item.inlines[0].width, 9 * 50 * 1.5);
			assert.equal(pages[0].items[1].item.inlines[0].width, 10 * 50 * 1.5);

			assert.equal(pages[0].items[2].item.inlines[0].width, 10 * 50);
			assert.equal(pages[0].items[3].item.inlines[0].width, 8 * 50);
			assert.equal(pages[0].items[4].item.inlines[0].width, 6 * 50);
		});

		it('should support unordered lists', function () {
			var desc = [
				'paragraph',
				{
					ul: [
						'item 1',
						'item 2',
						'item 3'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 7);
		});

		it('unordered lists should have circles to the left of each element', function () {
			var desc = [
				'paragraph',
				{
					ul: [
						'item 1',
						'item 2',
						'item 3'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 7);

			for (var i = 1; i < 7; i += 2) {
				var circle = pages[0].items[i + 1].item; // circle is added after line
				var itemLine = pages[0].items[i].item;

				assert(circle.x < itemLine.x);
				assert(circle.y > itemLine.y && circle.y < itemLine.y + itemLine.getHeight());
			}
		});

		it('circle radius for unordered lists should be based on fontSize', function () {
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
			assert.equal((pages[0].items[7].item.r1 / pages[0].items[1].item.r1).toFixed(1), (18 / 10).toFixed(1));
		});

		it('unordered lists should support nested lists', function () {
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
			assert.equal(pages[0].items.length, 10);

			// positioning
			assert.equal(pages[0].items[0].item.x, pages[0].items[8].item.x);
			assert.equal(pages[0].items[2].item.x, pages[0].items[4].item.x);
			assert(pages[0].items[0].item.x < pages[0].items[2].item.x);

			// circle positioning
			var circle = pages[0].items[3].item;
			var itemLine = pages[0].items[2].item;
			assert(circle.x < itemLine.x);
			assert(circle.y > itemLine.y && circle.y < itemLine.y + itemLine.getHeight());
		});

		it('if there is enough space left on the page for the circle but not enough for the following line of text, circle should be drawn on the next page, together with the text', function () {
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
						'paragraph'
					],
					noWrap: true
				},
				{
					fontSize: 90,
					ul: [
						{
							text: [
								{ text: 'line ', noWrap: true },
								{ text: '1' }
							]
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 9);
			assert.equal(pages[1].items.length, 3);
		});

		it('should support ordered lists', function () {
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
			assert.equal(pages[0].items.length, 4 + 3);
		});

		it('numbers in ordered list should use list style, not item-level style (bugfix)', function () {
			var desc = [
				{
					fontSize: 5,
					ol: [
						{ text: 'item 1', fontSize: 15 },
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.inlines[0].fontSize, 15);
			assert.equal(pages[0].items[1].item.inlines[0].fontSize, 5);
		});

		it('numbers in ordered lists should be positioned to the left of each item', function () {
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
			assert.equal(pages[0].items.length, 4 + 3);


			for (var i = 0; i < 3; i++) {
				var itemLine = pages[0].items[1 + 2 * i].item;
				var numberLine = pages[0].items[2 + 2 * i].item;

				assert(numberLine.x < itemLine.x);
				assert(numberLine.x + numberLine.getWidth() <= itemLine.x);
				assert(numberLine.y >= itemLine.y && numberLine.y <= itemLine.y + itemLine.getHeight());
			}
		});

		it('numbers in ordered lists should be positioned to the left of each item also in more complex cases', function () {
			var desc = [
				'paragraph',
				{
					ol: [
						'item 1',
						{ fontSize: 40, text: 'item 2' },
						{ text: ['item 3', { text: 'next inline', fontSize: 30 }] },
						'item 4\nhaving two lines',
						{ text: ['item 5', { text: 'next inline\nand next line', fontSize: 30 }] }
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);

			for (var i = 0; i < 3; i++) {
				var paragraphLine = pages[0].items[1 + 2 * i].item;
				var numberLine = pages[0].items[2 + 2 * i].item;

				assert(numberLine.x < paragraphLine.x);
				assert(numberLine.x + numberLine.getWidth() <= paragraphLine.x);
			}
		});

		it('numbers in ordered lists should be aligned (vertically) to the bottom of the first line of each item', function () {
			var desc = [
				'paragraph',
				{
					ol: [
						'item 1',
						{ fontSize: 40, text: 'item 2' },
						{ text: ['item 3', { text: 'next inline', fontSize: 30 }] },
						'item 4\nhaving two lines',
						{ text: ['item 5', { text: 'next inline\nand next line', fontSize: 30 }] }
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);

			for (var i = 0; i < 3; i++) {
				var paragraphLine = pages[0].items[1 + 2 * i].item;
				var numberLine = pages[0].items[2 + 2 * i].item;

				assert.equal(numberLine.y + numberLine.getAscenderHeight(), paragraphLine.y + paragraphLine.getAscenderHeight());
			}
		});

		it('numbers in ordered list should be automatically incremented', function () {
			var desc = [
				{
					ol: [
						'item',
						'item',
						'item',
						'item'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			for (var i = 0; i < 4; i++) {
				var numberLine = pages[0].items[1 + 2 * i].item;

				assert.equal(numberLine.inlines[0].text, (i + 1).toString() + '. ');
			}
		});

		it('numbers in ordered sublist should have independent counters', function () {
			var desc = [
				{
					ol: [
						'item 1',
						'item 2',
						{
							ol: [
								'subitem 1',
								'subitem 2',
								'subitem 3'
							]
						},
						'item 3',
						'item 4'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			// item 2
			assert.equal(pages[0].items[3].item.inlines[0].text, '2. ');
			// item 3
			assert.equal(pages[0].items[3 + 6].item.inlines[0].text, '3. ');

			// subitem 1
			assert.equal(pages[0].items[5].item.inlines[0].text, '1. ');
			// subitem 2
			assert.equal(pages[0].items[7].item.inlines[0].text, '2. ');
		});

		it('ordered lists should not add an empty line below the number (bugfix)', function () {
			var desc = [
				{
					ol: [
						'item 1',
						'item 2'
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages[0].items[0].item.y, 40);
			assert.equal(pages[0].items[1].item.y, 40);
			assert.equal(pages[0].items[2].item.y, 40 + 12);
		});

		it('should support tables with fixed widths', function () {
			var desc = [
				{
					table: {
						widths: [30, 50, 40],
						body: [
							['a', 'b', 'c'],
							[{ text: 'aaa', noWrap: true }, { text: 'bbb', noWrap: true }, { text: 'ccc', noWrap: true }]
						]
					},
					layout: emptyTableLayout
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 6);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 30);
			assert.equal(pages[0].items[2].item.x, 40 + 30 + 50);
			assert.equal(pages[0].items[3].item.x, 40);
			assert.equal(pages[0].items[4].item.x, 40 + 30);
			assert.equal(pages[0].items[5].item.x, 40 + 30 + 50);
			assert.equal(pages[0].items[0].item.y, 40);
			assert.equal(pages[0].items[1].item.y, 40);
			assert.equal(pages[0].items[2].item.y, 40);
			assert.equal(pages[0].items[3].item.y, 40 + 12);
			assert.equal(pages[0].items[4].item.y, 40 + 12);
			assert.equal(pages[0].items[5].item.y, 40 + 12);
		});

		it('should support tables with auto column widths', function () {
			var desc = [
				{
					table: {
						widths: 'auto',
						body: [
							['a', 'b', 'c'],
							['aaa', 'bbb', 'ccc']
						]
					},
					layout: emptyTableLayout
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 6);
			assert.equal(pages[0].items[0].item.x, 40);
			assert.equal(pages[0].items[1].item.x, 40 + 3 * 12);
			assert.equal(pages[0].items[2].item.x, 40 + 6 * 12);
			assert.equal(pages[0].items[3].item.x, 40);
			assert.equal(pages[0].items[4].item.x, 40 + 3 * 12);
			assert.equal(pages[0].items[5].item.x, 40 + 6 * 12);
			assert.equal(pages[0].items[0].item.y, 40);
			assert.equal(pages[0].items[1].item.y, 40);
			assert.equal(pages[0].items[2].item.y, 40);
			assert.equal(pages[0].items[3].item.y, 40 + 12);
			assert.equal(pages[0].items[4].item.y, 40 + 12);
			assert.equal(pages[0].items[5].item.y, 40 + 12);
		});

		it('should support tables spanning across pages', function () {
			var desc = [{
				table: {
					widths: 'auto',
					body: []
				},
				layout: emptyTableLayout
			}];

			for (var i = 0; i < 80; i++) {
				desc[0].table.body.push(['a', 'b', 'c']);
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
		});

		it('should support table-cell spanning across pages', function () {
			var desc = [{
				table: {
					widths: 'auto',
					body: []
				},
				layout: emptyTableLayout
			}];

			for (var i = 0; i < 59; i++) {
				desc[0].table.body.push(['a', 'b', 'c']);
			}

			desc[0].table.body.push(['a\nb\nc', 'a\nb\nc', 'a\nb\nc']);

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[1].items.length, 6);
		});

		it('should not split table headers', function () {
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

			for (var i = 0; i < 59; i++) {
				desc[0].stack.push('sample line');
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 59);
			assert.equal(pages[1].items.length, 9);
		});

		it('should not split multi-row headers', function () {
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
							['a', 'b', 'c']
						]
					},
					layout: emptyTableLayout
				}];

			for (var i = 0; i < 59; i++) {
				desc[0].stack.push('sample line');
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 59);
			assert.equal(pages[1].items.length, 9);
		});

		it('should repeat table headers', function () {
			var desc = [{
				table: {
					headerRows: 1,
					widths: 'auto',
					body: [
						['h1', 'h2', 'h3']
					]
				},
				layout: emptyTableLayout
			}];

			for (var i = 0; i < 590; i++) {
				desc[0].table.body.push(['a', 'b', 'c']);
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 10);
			pages.forEach(function (page) {
				assert.equal(page.items[0].item.inlines[0].text, 'h1');
				assert.equal(page.items[0].item.y, 40);
				assert.equal(page.items[0].item.x, 40);
			});
		});

		it('should not change x positions of repeated table headers, if context.x has changed (bugfix)', function () {
			var desc = [{
				table: {
					headerRows: 1,
					widths: 'auto',
					body: [
						['h1', 'h2', 'h3'],
						[{
							ul: [

							]
						}, 'b', 'c']
					]
				},
				layout: emptyTableLayout
			}];

			for (var i = 0; i < 100; i++) {
				desc[0].table.body[1][0].ul.push('item');
			}

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].items[0].item.x, 40);
			assert(pages[0].items[4].item.x > 40);
			assert.equal(pages[1].items[0].item.x, 40);
		});

		it('should throw an exception if unrecognized structure is detected', function () {
			assert.throws(
				function () {
					builder.layoutDocument([{ ol: ['item', { abc: 'test' }] }], sampleTestProvider);
				}
			);
		});

		it('should support a switch of page orientation within a document', function () {
			var desc = [
				{
					text: 'Page 1, document orientation or default portrait'
				},
				{
					text: 'Page 2, landscape',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				}];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].pageSize.orientation, 'portrait');
			assert.equal(pages[1].pageSize.orientation, 'landscape');
		});

		it('should support changing the page orientation to landscape consecutively', function () {
			var desc = [
				{
					text: 'Page 1, document orientation or default portrait'
				},
				{
					text: 'Page 2, landscape',
					pageBreak: 'before',
					pageOrientation: 'landscape'
				},
				{
					text: 'Page 3, landscape again',
					pageBreak: 'after',
					pageOrientation: 'landscape'
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 3);
			assert.equal(pages[0].pageSize.orientation, 'portrait');
			assert.equal(pages[1].pageSize.orientation, 'landscape');
			assert.equal(pages[2].pageSize.orientation, 'landscape');
		});

		it('should use the absolutePosition attribute to position in absolute coordinates', function () {
			var desc = [
				{
					columns: [
						{
							text: 'text 1',
							absolutePosition: { x: 123, y: 200 }
						},
						{
							text: 'text 2',
							absolutePosition: { x: 0, y: 0 }
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items[0].item.x, 123);
			assert.equal(pages[0].items[0].item.y, 200);
			assert.equal(pages[0].items[1].item.x, 0);
			assert.equal(pages[0].items[1].item.y, 0);
		});

		[1, 2].forEach(function (pageBreakCount) {
			it('should preserve absolute polyline points after ' + pageBreakCount + ' layout retries', function () {
				var desc = [{ text: 'First page' }];
				for (var i = 0; i < pageBreakCount; i++) {
					desc.push({ text: 'Next page', id: 'break' + i });
				}
				desc.push({
					absolutePosition: { x: 40, y: 250 },
					canvas: [{
						type: 'polyline',
						closePath: true,
						points: [{ x: 0, y: 0 }, { x: 26, y: 26 }, { x: 18, y: 8 }]
					}]
				});

				var pages = builder.layoutDocument(desc, sampleTestProvider, {}, undefined, undefined, undefined, undefined, undefined, function (node) {
					return typeof node.id === 'string' && node.id.indexOf('break') === 0;
				});

				assert.equal(pages.length, pageBreakCount + 1);
				var vectors = pages[pageBreakCount].items.filter(item => item.type === 'vector');
				assert.equal(vectors.length, 1);
				assert.deepStrictEqual(vectors[0].item.points, [{ x: 40, y: 250 }, { x: 66, y: 276 }, { x: 58, y: 258 }]);
			});
		});

		it('should use the absolutePosition attribute without pagebreak in canvas', function () {
			var builderAP = new LayoutBuilder({ width: 841.89, height: 555.28, orientation: 'portrait' }, { left: 40, right: 40, top: 40, bottom: 40 });
			builderAP.pages = [];
			builderAP.context = [{ page: -1, availableWidth: 320, availableHeight: 0 }];
			builderAP.styleStack = new StyleContextStack();
			var desc = [
				{
					absolutePosition: { x: 0, y: 0 },
					canvas: [
						{
							type: 'polyline',
							lineWidth: 0,
							closePath: true,
							color: '#fce5d4',
							points: [{ x: 530, y: 0 }, { x: 650, y: 0 }, { x: 841.89, y: 50 }, { x: 841.89, y: 270 }]
						},
						{
							type: 'polyline',
							lineWidth: 0,
							closePath: true,
							color: '#fce5d4',
							points: [{ x: 0, y: 400 }, { x: 300, y: 555.28 }, { x: 200, y: 555.28 }, { x: 0, y: 500 }]
						}
					]
				}
			];

			var pages = builderAP.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
		});

		it('should use the absolutePosition attribute without pagebreak in image', function () {
			var builderAP = new LayoutBuilder({ width: 841.89, height: 555.28, orientation: 'portrait' }, { left: 40, right: 40, top: 40, bottom: 40 });
			builderAP.pages = [];
			builderAP.context = [{ page: -1, availableWidth: 320, availableHeight: 0 }];
			builderAP.styleStack = new StyleContextStack();
			var desc = [
				{
					image: 'sampleImage.jpg',
					width: 80,
					absolutePosition: { x: 250, y: 500 }
				},
				{
					image: 'sampleImage.jpg',
					width: 80,
					absolutePosition: { x: 450, y: 520 }
				}
			];

			var pages = builderAP.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
		});

		it('should use the absolutePosition attribute without pagebreak in qr', function () {
			var builderAP = new LayoutBuilder({ width: 841.89, height: 555.28, orientation: 'portrait' }, { left: 40, right: 40, top: 40, bottom: 40 });
			builderAP.pages = [];
			builderAP.context = [{ page: -1, availableWidth: 320, availableHeight: 0 }];
			builderAP.styleStack = new StyleContextStack();
			var desc = [
				{
					qr: 'pdfmake',
					absolutePosition: { x: 250, y: 500 }
				},
				{
					qr: 'pdfmake',
					absolutePosition: { x: 450, y: 520 }
				}
			];

			var pages = builderAP.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
		});

		it('should use the relativePosition attribute to position in relativePosition coordinates', function () {
			var desc = [
				{
					text: 'text 1',
					relativePosition: { x: 123, y: 200 }
				},
				{
					text: 'text 2',
					relativePosition: { x: 0, y: 0 }
				}
			]
				;

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages[0].items[0].item.x, 163);
			assert.equal(pages[0].items[0].item.y, 240);
			assert.equal(pages[0].items[1].item.x, 40);
			assert.equal(pages[0].items[1].item.y, 40);
		});

		it('should use the relativePosition attribute to position in relativePosition coordinates in a table cell', function () {
			var desc = [
				{
					table: {
						widths: [200, 200],
						body: [
							[
								{
									text: 'text 1',
									style: {
										alignment: 'center',
									},
									relativePosition: { x: 10, y: 200 },
								},
								{
									text: 'text 2',
									relativePosition: { x: 0, y: 0 }
								}
							],
						],
					},
					layout: emptyTableLayout,
				},
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, {});

			assert.equal(pages[0].items[0].item.x, 114);
			assert.equal(pages[0].items[0].item.y, 240);
			assert.equal(pages[0].items[1].item.x, 240);
			assert.equal(pages[0].items[1].item.y, 40);
		});

		it('should not break nodes across multiple pages when unbreakable attribute is passed', function () {
			var desc = [
				{
					stack: [
						{
							text: 'first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, first paragraph, this time long enough to be broken into several lines and then to break the containing block, '
						},
						{
							text: 'beginning of another paragraph, this time long enough to be broken into several lines and then to break the containing blockanother paragraph, this time long enough to be broken into several lines and then to break the containing blockanother paragraph, this time long enough to be broken into several lines and then to break the containing blockanother paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block, another paragraph, this time long enough to be broken into several lines and then to break the containing block',
							unbreakable: true
						}
					]
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 33);
			assert.equal(pages[1].items.length, 53);
		});

		it('should support wrap long word', function () {
			var desc = [
				'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 3);
		});

		it('should support wrap long word with big font size', function () {
			var desc = [
				{
					text: 'abc',
					fontSize: 200
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 3);
		});

		it('should support wrap one big character with big font size', function () {
			var desc = [
				{
					text: 'a',
					fontSize: 200
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 1);
		});

		it('should support disable wrap long word by noWrap', function () {
			var desc = [
				{ text: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890', noWrap: true }
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);
			assert.equal(pages[0].items.length, 1);
		});

		it('should support not line break if is text inlines (#975)', function () {
			var TEXT = [
				{ text: 'Celestial Circle—' },
				{ text: 'The Faithful Ally', style: 'styled' },
				{ text: ', ' },
				{ text: 'Gift of Knowledge', style: 'styled' },
				{ text: ', ' },
				{ text: 'Servant of Infallible Locations', style: 'styled' },
				{ text: ', ' },
				{ text: 'Swift Spirit of Winged Transportation', style: 'styled' },
				{ text: ', ' },
				{ text: 'Warding the Created Mind', style: 'styled' }
			];

			var TEXT2 = [
				{ text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod ' },
				{ text: 're' },
				{ text: 'mark', style: 'styled' },
				{ text: 'able' }
			];

			var desc = [
				{ text: TEXT },
				{ text: TEXT2 }
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider, { styled: { color: 'dodgerblue' } }, { fontSize: 16 });
			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 16);
			assert.equal(pages[0].items[5].item.inlines.length, 3);
			assert.equal(pages[0].items[5].item.inlines[0].text, 'Locations');
			assert.equal(pages[0].items[5].item.inlines[1].text, ', ');
			assert.equal(pages[0].items[5].item.inlines[2].text, 'Swift ');

			assert.equal(pages[0].items[15].item.inlines.length, 3);
			assert.equal(pages[0].items[15].item.inlines[0].text, 're');
			assert.equal(pages[0].items[15].item.inlines[1].text, 'mark');
			assert.equal(pages[0].items[15].item.inlines[2].text, 'able');
		});

		it('should support line break if is text inlines and is new line', function () {
			var desc = [
				{ text: 'First line.\n' },
				{ text: 'Second line.' }
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[0].item.inlines.length, 2);
			assert.equal(pages[0].items[0].item.inlines[0].text, 'First ');
			assert.equal(pages[0].items[0].item.inlines[1].text, 'line.');

			assert.equal(pages[0].items[1].item.inlines.length, 2);
			assert.equal(pages[0].items[1].item.inlines[0].text, 'Second ');
			assert.equal(pages[0].items[1].item.inlines[1].text, 'line.');
		});

		it('should support images', function () {
			var pages = builder.layoutDocument([{ image: 'sample.jpg', width: 80 }, { text: 'after' }], sampleTestProvider);
			var image = pages[0].items[0];
			assert.equal(image.type, 'image');
			assert.equal(image.item.image, 'sample.jpg');
			assert.equal(image.item.x, 40);
			assert.equal(image.item.y, 40);
			assert.equal(image.item._width, 80);
			assert.equal(image.item._height, 80);
			assert.equal(pages[0].items[1].item.y, 120);
		});

		['left', 'center', 'right'].forEach(function (alignment, index) {
			it('should align images to the ' + alignment, function () {
				var pages = builder.layoutDocument([{ image: 'sample.jpg', width: 80, alignment: alignment }], sampleTestProvider);
				assert.equal(pages[0].items[0].item.x, 40 + index * 120);
			});
		});

		it('should break pages if image cannot fit on current page', function () {
			var pages = builder.layoutDocument([
				{ image: 'first.jpg', width: 80, height: 650 },
				{ image: 'second.jpg', width: 80, height: 100 }
			], sampleTestProvider);
			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 1);
			assert.equal(pages[1].items.length, 1);
			assert.equal(pages[1].items[0].item.image, 'second.jpg');
			assert.equal(pages[1].items[0].item.y, 40);
		});

		it('should move images drawn inside unbreakable blocks properly to the next page', function () {
			var pages = builder.layoutDocument([
				{ image: 'first.jpg', width: 80, height: 650 },
				{ unbreakable: true, stack: [{ text: 'caption' }, { image: 'second.jpg', width: 80, height: 100 }] }
			], sampleTestProvider);
			assert.equal(pages.length, 2);
			assert.equal(pages[0].items.length, 1);
			assert.equal(pages[1].items.length, 2);
			assert.equal(pages[1].items[0].item.y, 40);
			assert.equal(pages[1].items[1].item.image, 'second.jpg');
			assert.equal(pages[1].items[1].item.x, 40);
			assert.equal(pages[1].items[1].item.y, 52);
		});

		it('should copy images inside repeated table headers', function () {
			var body = [[{ image: 'header.jpg', width: 20 }]];
			for (var i = 0; i < 80; i++) body.push([{ text: 'row ' + i }]);
			var pages = builder.layoutDocument([{ table: { headerRows: 1, widths: [100], body: body }, layout: emptyTableLayout }], sampleTestProvider);
			assert(pages.length > 1);
			pages.forEach(function (page) {
				var images = page.items.filter(item => item.type === 'image');
				assert.equal(images.length, 1);
				assert.equal(images[0].item.image, 'header.jpg');
				assert.equal(images[0].item.y, 40);
				assert.equal(images[0].item._width, 20);
			});
		});

		it('should support table styling', function () {
			var pages = builder.layoutDocument([{
				style: 'table', table: { widths: [100], body: [['cell']] }, layout: emptyTableLayout
			}], sampleTestProvider, { table: { color: 'red', fontSize: 20 } });
			var inline = pages[0].items[0].item.inlines[0];
			assert.equal(inline.color, 'red');
			assert.equal(inline.fontSize, 20);
		});

		it('should support subtables with repeated headers', function () {
			var body = [['nested header']];
			for (var i = 0; i < 80; i++) body.push(['row ' + i]);
			var nested = { table: { headerRows: 1, widths: [200], body: body }, layout: emptyTableLayout };
			var pages = builder.layoutDocument([{
				table: { widths: [240], body: [[nested]] }, layout: emptyTableLayout
			}], sampleTestProvider);
			assert(pages.length > 1);
			pages.forEach(function (page) {
				var firstLine = page.items.find(item => item.type === 'line');
				assert.equal(firstLine.item.inlines.map(inline => inline.text).join(''), 'nested header');
				assert.equal(firstLine.item.y, 40);
			});
			var rows = pages.flatMap(page => page.items).filter(item => item.type === 'line')
				.map(item => item.item.inlines.map(inline => inline.text).join('')).filter(text => text !== 'nested header');
			assert.deepEqual(rows, body.slice(1).map(row => row[0].text));
		});

		['header', 'footer'].forEach(function (type) {
			it('should render a dynamic ' + type + ' with page numbers and page count on every page', function () {
				var callback = sinon.spy(function (currentPage, pageCount) {
					return { text: type + ' ' + currentPage + '/' + pageCount, fontSize: 10 };
				});
				var pages = builder.layoutDocument([
					{ text: 'first' }, { text: 'second', pageBreak: 'before' }
				], sampleTestProvider, {}, {}, undefined, type === 'header' ? callback : undefined, type === 'footer' ? callback : undefined);
				assert.equal(callback.callCount, 2);
				pages.forEach(function (page, index) {
					var line = page.items.find(item => item.type === 'line' && item.item.inlines.map(inline => inline.text).join('') === type + ' ' + (index + 1) + '/2');
					assert(line);
					assert.equal(line.item.y, type === 'header' ? 0 : 760);
				});
			});
		});

		[{ width: 300, height: 500 }, { width: 600, height: 400 }].forEach(function (size) {
			it('should lay out content within page size ' + size.width + 'x' + size.height, function () {
				var sizedBuilder = new LayoutBuilder(size, { left: 40, right: 40, top: 40, bottom: 40 });
				var pages = sizedBuilder.layoutDocument([{ text: 'a\n'.repeat(100) + 'end' }], sampleTestProvider);
				assert(pages.length > 1);
				pages.forEach(function (page) {
					assert.equal(page.pageSize.width, size.width);
					assert.equal(page.pageSize.height, size.height);
					page.items.forEach(function (item) {
						assert(item.item.y >= 40);
						assert(item.item.y + item.item.getHeight() <= size.height - 40);
					});
				});
			});
		});

		it('should support tables with percentage column widths', function () {
			var node = { table: { widths: ['25%', '75%'], body: [['a', 'b']] }, layout: emptyTableLayout };
			var pages = builder.layoutDocument([node], sampleTestProvider);
			assert.equal(node.table.widths[0]._calcWidth, 80);
			assert.equal(node.table.widths[1]._calcWidth, 240);
			assert.equal(pages[0].items[1].item.x, 120);
		});

		it('should support table cell padding', function () {
			var pages = builder.layoutDocument([{
				table: { widths: [100], body: [['cell']] },
				layout: Object.assign({}, emptyTableLayout, {
					paddingLeft: () => 7, paddingRight: () => 9,
					paddingTop: () => 11, paddingBottom: () => 13
				})
			}, { text: 'after' }], sampleTestProvider);
			assert.equal(pages[0].items[0].item.x, 47);
			assert.equal(pages[0].items[0].item.y, 51);
			assert.equal(pages[0].items[1].item.y, 40 + 11 + 12 + 13);
		});

		it('should support programmatic table borders and cell fills', function () {
			var pages = builder.layoutDocument([{
				table: { widths: [100], body: [['first'], ['second']] },
				layout: {
					hLineWidth: () => 2, vLineWidth: () => 3,
					hLineColor: () => 'red', vLineColor: () => 'blue',
					fillColor: row => row === 0 ? 'yellow' : 'green'
				}
			}], sampleTestProvider);
			var vectors = pages[0].items.filter(item => item.type === 'vector').map(item => item.item);
			assert(vectors.some(vector => vector.type === 'line' && vector.lineWidth === 2 && vector.lineColor === 'red'));
			assert(vectors.some(vector => vector.type === 'line' && vector.lineWidth === 3 && vector.lineColor === 'blue'));
			assert(vectors.some(vector => vector.type === 'rect' && vector.color === 'yellow'));
			assert(vectors.some(vector => vector.type === 'rect' && vector.color === 'green'));
		});

		it('should support vertical alignment inside table cells', function () {
			var pages = builder.layoutDocument([{
				table: { widths: [100, 100], body: [[{ text: 'short', verticalAlignment: 'middle' }, 'a\nb\nc']] },
				layout: emptyTableLayout
			}], sampleTestProvider);
			var begin = pages[0].items.find(item => item.type === 'beginVerticalAlignment');
			var end = pages[0].items.find(item => item.type === 'endVerticalAlignment');
			assert.equal(begin.item.verticalAlignment, 'middle');
			assert.equal(end.item.verticalAlignment, 'middle');
			assert.equal(begin.item.getNodeHeight(), 12);
			assert.equal(begin.item.getViewHeight(), 36);
		});

		it('should keep words joined by non-breaking spaces on the same line', function () {
			var pages = builder.layoutDocument([{ text: 'prefix prefix prefix x aa\u00a0bb' }], sampleTestProvider);
			var lines = pages[0].items.map(item => item.item.inlines.map(inline => inline.text).join(''));
			assert.equal(lines.length, 2);
			assert.equal(lines[1], 'aa\u00a0bb');
		});

		it('should keep noWrap text together when it does not fit the remaining line width', function () {
			var pages = builder.layoutDocument([{ text: [
				{ text: 'prefix prefix prefix ' }, { text: 'aa bb cc', noWrap: true }
			] }], sampleTestProvider);
			assert.equal(pages[0].items.length, 2);
			assert.equal(pages[0].items[1].item.inlines[0].text, 'aa bb cc');
		});

		it('should keep adjacent noWrap inlines together even when the second starts with a space', function () {
			var pages = builder.layoutDocument([{ text: [
				{ text: 'prefix ' }, { text: 'First line', noWrap: true }, { text: ' Second line', noWrap: true }
			] }], sampleTestProvider);
			assert.equal(pages[0].items.length, 2);
			assert.deepEqual(pages[0].items[1].item.inlines.map(inline => inline.text), ['First line', ' Second line']);
		});

		it('should continue inline text across pages without losing content', function () {
			var texts = Array.from({ length: 100 }, (_, index) => 'line ' + index);
			var pages = builder.layoutDocument([{ text: texts.map((text, index) => ({ text: text + (index < 99 ? '\n' : ''), color: index % 2 ? 'red' : 'blue' })) }], sampleTestProvider);
			assert(pages.length > 1);
			var lines = pages.flatMap(page => page.items).map(item => item.item.inlines.map(inline => inline.text).join(''));
			assert.deepEqual(lines, texts);
		});

		it('should support line-height', function () {
			var pages = builder.layoutDocument([{ text: 'first\nsecond', fontSize: 10, lineHeight: 2 }, { text: 'after' }], sampleTestProvider);
			assert.deepEqual(pages[0].items.map(item => item.item.y), [40, 60, 80]);
		});

		it('should support programmatically generated styles', function () {
			var pages = builder.layoutDocument([0, 1].map(index => ({ text: 'text', color: index % 2 ? 'red' : 'blue', fontSize: 10 + index })), sampleTestProvider);
			assert.deepEqual(pages[0].items.map(item => item.item.inlines[0].color), ['blue', 'red']);
			assert.deepEqual(pages[0].items.map(item => item.item.inlines[0].fontSize), [10, 11]);
		});

		// describe('features requiring implementation', function () {
		// 	// Renderer.renderVector does not accept a winding-rule option.
		// 	it.skip('should support vector winding rules');
		// 	// Margins currently apply to blocks, not individual text inlines.
		// 	it.skip('should support inline margins');
		// 	// No document-definition API exists for a line-filling callback.
		// 	it.skip('should support line filling action');
		// 	// Renderer.renderLine still writes each inline separately (see its TODO).
		// 	it.skip('should render lines to pdf in a single call if style is the same');
		// 	// Text transforms are not implemented by TextInlines or Renderer.
		// 	it.skip('should support uppercase text transforms');
		// 	it.skip('should support lowercase text transforms');
		// });
	});

	describe('processRow', function () {
		var builder2;

		function createTable(headerRows, otherRows, singleRowLines, pageBreakAfter, secondColumnPageBreakAfter) {
			var tableNode = {
				table: {
					headerRows: headerRows || 0,
					widths: [100, 100],
					body: [
					]
				}
			};

			var rows = headerRows + otherRows;
			singleRowLines = singleRowLines || 1;

			while (rows--) {
				var stack1 = { stack: [{ text: 'a' }] };
				var stack2 = { stack: [{ text: 'a' }] };
				for (var x = 0; x < singleRowLines; x++) {
					stack1.stack.push({ text: 'a' });
					stack2.stack.push({ text: 'b' });
				}
				if (pageBreakAfter) {
					stack1.stack[pageBreakAfter - 1].pageBreak = 'after';
				}
				if (secondColumnPageBreakAfter) {
					stack2.stack[secondColumnPageBreakAfter - 1].pageBreak = 'after';
				}

				tableNode.table.body.push([stack1, stack2]);
			}

			new DocMeasure(sampleTestProvider, {}, {}, {}).measureDocument(tableNode);
			ColumnCalculator.buildColumnWidths(tableNode.table.widths, 320);

			return tableNode;
		}

		beforeEach(function () {
			var pageSize = { width: 400, height: 800, orientation: 'portrait' };
			var pageMargins = { left: 40, top: 40, bottom: 40, right: 40 };

			builder2 = new LayoutBuilder(pageSize, pageMargins, {});
			var ctx = new DocumentContext();
			ctx.addPage(pageSize, pageMargins);
			builder2.writer = new PageElementWriter(ctx);
			builder2.linearNodeList = [];
		});

		it('should return an empty array if no page breaks occur', function () {
			var doc = createTable(1, 0);

			var result = builder2.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc._offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0
			});

			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 0);
		});

		it('on page break should return an entry with ending/starting positions', function () {
			var doc = createTable(0, 1, 10, 5, 5);
			var result = builder2.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc._offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0
			});
			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 1);
			assert.equal(result.pageBreaks[0].prevPage, 0);
			assert.equal(result.pageBreaks[0].prevY, 40 + 12 * 6);
		});

		it('on page break should return an entry with ending/starting positions 2', function () {
			var doc = createTable(0, 1, 10, 5);
			var result = builder2.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc._offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0
			});

			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 1);
			assert.equal(result.pageBreaks[0].prevPage, 0);

			assert.equal(result.pageBreaks[0].prevY, 40 + 12 * 5);
		});

		it('on multi-pass page break (columns or table columns) should treat bottom-most page-break as the ending position ', function () {
			var doc = createTable(0, 1, 10, 5, 7);
			var result = builder2.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc._offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0
			});

			assert.equal(result.pageBreaks[0].prevY, 40 + 12 * 7);
		});

		it('on multiple page breaks (more than 2 pages), should return all entries with ending/starting positions', function () {
			var doc = createTable(0, 1, 100, 90, 90);
			var result = builder2.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc._offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0
			});

			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 2);
			assert.equal(result.pageBreaks[0].prevPage, 0);
			assert.equal(result.pageBreaks[0].prevY, 40 + 60 * 12);
			assert.equal(result.pageBreaks[1].prevPage, 1);
			assert.equal(result.pageBreaks[1].prevY, 40 + (90 - 60) * 12);
		});

		it('on multiple page breaks (more than 2 pages), should return all entries with ending/starting positions 2', function () {
			var doc = createTable(0, 1, 100, 90, 90);
			var result = builder2.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc._offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0
			});

			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 2);
			assert.equal(result.pageBreaks[0].prevPage, 0);
			assert.equal(result.pageBreaks[0].prevY, 40 + 60 * 12);
			assert.equal(result.pageBreaks[1].prevPage, 1);
			assert.equal(result.pageBreaks[1].prevY, 40 + 30 * 12);
		});

		it('on multiple and multi-pass page breaks should calculate bottom-most endings for every page', function () {
			var doc = createTable(0, 1, 100, 90, 92);
			var result = builder2.processRow({
				cells: doc.table.body[0],
				widths: doc.table.widths,
				gaps: doc._offsets.offsets,
				tableBody: doc.table.body,
				rowIndex: 0
			});

			assert(result.pageBreaks instanceof Array);
			assert.equal(result.pageBreaks.length, 2);
			assert.equal(result.pageBreaks[0].prevPage, 0);
			assert.equal(result.pageBreaks[0].prevY, 40 + 60 * 12);
			assert.equal(result.pageBreaks[1].prevPage, 1);
			assert.equal(result.pageBreaks[1].prevY, 40 + (92 - 60) * 12);
		});
	});




	describe('dynamic header/footer', function () {
		var docStructure, pdfDocument, styleDictionary, defaultStyle = undefined, background = undefined, header = undefined, footer = undefined, watermark = undefined, pageBreakBeforeFunction = undefined;

		beforeEach(function () {
			pdfDocument = sampleTestProvider;
			styleDictionary = {};
		});

		it('should provide the current page, page count and page size', function () {
			docStructure = ['Text'];
			header = sinon.spy();
			footer = sinon.spy();
			background = sinon.spy();

			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			var pageSize = { width: 400, height: 800, orientation: 'portrait' };
			assert.equal(header.getCall(0).args[0], 1);
			assert.equal(header.getCall(0).args[1], 1);
			assert.deepEqual(header.getCall(0).args[2], pageSize);

			assert.equal(footer.getCall(0).args[0], 1);
			assert.equal(footer.getCall(0).args[1], 1);
			assert.deepEqual(footer.getCall(0).args[2], pageSize);
		});
	});

	describe('dynamic background', function () {
		var docStructure, pdfDocument, styleDictionary, defaultStyle = undefined, background = undefined, header = undefined, footer = undefined, watermark = undefined, pageBreakBeforeFunction = undefined;

		beforeEach(function () {
			pdfDocument = sampleTestProvider;
			styleDictionary = {};
		});

		it('should provide the current page and page size', function () {
			docStructure = ['Text'];
			background = sinon.spy();

			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			var pageSize = { width: 400, height: 800, orientation: 'portrait' };
			assert.equal(background.getCall(0).args[0], 1);
			assert.deepEqual(background.getCall(0).args[1], pageSize);
		});
	});

	describe('dynamic page break control', function () {

		var docStructure, pdfDocument, styleDictionary, defaultStyle = undefined, background = undefined, header = undefined, footer = undefined, watermark = undefined, pageBreakBeforeFunction = undefined;


		beforeEach(function () {
			pdfDocument = sampleTestProvider;
			styleDictionary = {};
		});

		['header', 'footer'].forEach(function (type) {
			it('should reset reused ' + type + ' canvas positions when content is laid out again', function () {
				var firstPageNode = { stack: ['Heading', { canvas: [{ type: 'rect', x: 0, y: 0, w: 10, h: 10 }] }] };
				var repeatable = function (pageNumber) {
					return pageNumber === 1 ? firstPageNode : { text: 'Other page' };
				};
				var pages = builder.layoutDocument(
					[{ text: 'First' }, { text: 'Second', id: 'second' }],
					sampleTestProvider, {}, undefined, undefined,
					type === 'header' ? repeatable : undefined,
					type === 'footer' ? repeatable : undefined,
					undefined, node => node.id === 'second'
				);

				assert.equal(pages.length, 2);
				var vector = pages[0].items.find(item => item.type === 'vector');
				assert.equal(vector.item.y, (type === 'header' ? 0 : 760) + 12);
			});

			it('should not apply pageBreakBefore to dynamic ' + type + ' nodes (issue #1095)', function () {
				var repeatableCalls = 0;
				var repeatable = function () {
					assert(++repeatableCalls <= 5, 'Page layout keeps recreating the ' + type);
					return { stack: [{ text: 'Page number', id: 'page-number' }] };
				};
				var pageBreakBefore = sinon.spy(function (node) {
					return node.startPosition.top >= 730;
				});
				var pages = builder.layoutDocument(
					[{ text: 'Text', id: 'content', margin: [0, 680, 0, 0] }],
					sampleTestProvider, {}, undefined, undefined,
					type === 'header' ? repeatable : undefined,
					type === 'footer' ? repeatable : undefined,
					undefined, pageBreakBefore
				);

				assert.equal(pages.length, 1);
				assert.equal(repeatableCalls, 1);
				assert.deepEqual(pageBreakBefore.getCalls().map(call => call.args[0].id), [undefined, 'content']);
				assert.deepEqual(pageBreakBefore.getCall(1).args[1].getFollowingNodesOnPage(), []);
				var lines = pages[0].items.filter(item => item.type === 'line');
				assert.equal(lines.length, 2);
				assert.equal(lines[1].item.inlines.map(inline => inline.text).join(''), 'Page number');
				assert.equal(lines[1].item.y, type === 'header' ? 0 : 760);
			});
		});

		[false, true].forEach(function (useSection) {
			it('should expose only content in surrounding node lists' + (useSection ? ' with section headers and footers' : ''), function () {
				var content = {
					id: 'body',
					stack: [
						{ text: 'First page', id: 'first' },
						{ text: 'Second page', id: 'second', pageBreak: 'before' },
						{ text: 'Third page', id: 'third', pageBreak: 'before' }
					]
				};
				var pageHeader = { text: 'Header', id: 'page-header' };
				var pageFooter = { text: 'Footer', id: 'page-footer' };
				var callback = sinon.spy(function (node, container) {
					var surrounding = container.getFollowingNodesOnPage().concat(container.getPreviousNodesOnPage(), container.getNodesOnNextPage());
					assert(surrounding.every(item => item.id !== 'page-header' && item.id !== 'page-footer'));
					if (node.id === 'first') {
						assert.deepEqual(container.getFollowingNodesOnPage(), []);
						assert.deepEqual(container.getNodesOnNextPage().map(item => item.id), ['second']);
					}
					return false;
				});
				var structure = useSection ? [{ section: content, header: pageHeader, footer: pageFooter }] : content;
				var pages = builder.layoutDocument(structure, sampleTestProvider, {}, undefined, undefined,
					() => JSON.parse(JSON.stringify(pageHeader)), () => JSON.parse(JSON.stringify(pageFooter)), undefined, callback);

				assert.equal(pages.length, 3);
				assert.deepEqual(callback.getCalls().map(call => call.args[0].id), ['body', 'first']);
				pages.forEach(page => {
					var lines = page.items.filter(item => item.type === 'line');
					assert.deepEqual(lines.slice(-2).map(line => line.item.inlines[0].text), ['Header', 'Footer']);
				});
			});
		});

		it('should move an orphan heading to the next page even when a footer follows it', function () {
			var content = [
				{ text: Array(59).fill('Filler').join('\n') },
				{ text: 'Heading', id: 'heading', headlineLevel: 1 },
				{ text: 'Paragraph', id: 'paragraph' }
			];
			var pages = builder.layoutDocument(content, sampleTestProvider, {}, undefined, undefined, undefined,
				() => ({ text: 'Footer' }), undefined,
				(node, container) => node.headlineLevel === 1 && container.getFollowingNodesOnPage().length === 0);

			assert.equal(pages.length, 2);
			assert.equal(content[1].positions[0].pageNumber, 2);
			assert.equal(content[2].positions[0].pageNumber, 2);
			assert.equal(content[1].positions[0].top, 40);
		});

		it('should create a pageBreak before', function () {

			docStructure = [
				{ text: 'Text 1', id: 'text1' },
				{ text: 'Text 2', id: 'text2' }
			];
			pageBreakBeforeFunction = function (node) {
				return node.id === 'text1';
			};


			var pages = builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			assert.equal(pages.length, 2);
		});

		it('should not check for page break if a page break is already specified', function () {

			docStructure = {
				stack: [
					{ text: 'Text 1', id: 'text1' },
					{ text: 'Text 2', id: 'text2', pageBreak: 'before' }
				],
				id: 'stack'
			};
			pageBreakBeforeFunction = sinon.spy();


			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			assert(pageBreakBeforeFunction.calledTwice);
			assert.equal(pageBreakBeforeFunction.getCall(0).args[0].id, 'stack');
			assert.deepEqual({ id: pageBreakBeforeFunction.getCall(1).args[0].id, text: pageBreakBeforeFunction.getCall(1).args[0].text }, { id: 'text1', text: 'Text 1' });
		});

		it('should provide the list of following nodes on the same page', function () {
			docStructure = [
				{ text: 'Text 1 (Page 1)', id: 'text1' },
				{ text: 'Text 2 (Page 1)', id: 'text2' },
				{ text: 'Text 3 (Page 1)', id: 'text3' },
				{ text: 'Text 4 (Page 2)', id: 'text4', pageBreak: 'before' }
			];

			pageBreakBeforeFunction = sinon.spy();


			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			assert.deepEqual(pageBreakBeforeFunction.getCall(1).args[1].getFollowingNodesOnPage().map(item => item.id), ['text2', 'text3']);
		});

		it('should provide the list of nodes on the next page', function () {
			docStructure = {
				stack: [
					{ text: 'Text 1 (Page 1)', id: 'text1', pageBreak: 'after' },
					{ text: 'Text 2 (Page 1)', id: 'text2' },
					{ text: 'Text 3 (Page 1)', id: 'text3' },
					{ text: 'Text 4 (Page 1)', id: 'text4' }
				],
				id: 'stack'
			};

			pageBreakBeforeFunction = sinon.spy();


			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			assert.deepEqual(pageBreakBeforeFunction.getCall(0).args[1].getNodesOnNextPage().map(item => item.id), ['text2', 'text3', 'text4']);
		});

		it('should provide the list of previous nodes on the same page', function () {
			docStructure = {
				stack: [
					{ text: 'Text 1 (Page 1)', id: 'text1', pageBreak: 'after' },
					{ text: 'Text 2 (Page 1)', id: 'text2' },
					{ text: 'Text 3 (Page 1)', id: 'text3' },
					{ text: 'Text 4 (Page 1)', id: 'text4' }
				],
				id: 'stack'
			};

			pageBreakBeforeFunction = sinon.spy();


			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			assert.deepEqual(pageBreakBeforeFunction.getCall(4).args[1].getPreviousNodesOnPage().map(item => item.id), ['stack', 'text2', 'text3']);
		});

		it('should provide the pages of the node', function () {
			docStructure = [
				{ text: 'Text 1 (Page 1)', id: 'text1' },
				{ text: 'Text 2 (Page 1)', id: 'text2' },
				{ text: 'Text 3 (Page 1)', id: 'text3' },
				{ text: 'Text 4 (Page 2)', id: 'text4', pageBreak: 'before' }
			];

			pageBreakBeforeFunction = sinon.spy();


			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			assert.equal(pageBreakBeforeFunction.getCall(0).args[0].pages, 2);
		});

		it('should provide the headlineLevel of the node', function () {
			docStructure = [
				{ text: 'Text 1 (Page 1)', id: 'text1', headlineLevel: 6 }
			];

			pageBreakBeforeFunction = sinon.spy();

			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			assert.equal(pageBreakBeforeFunction.getCall(1).args[0].headlineLevel, 6);
		});

		it('should provide the position of the node', function () {
			docStructure = [
				{ text: 'Text 1 (Page 1)', id: 'text1' }
			];

			pageBreakBeforeFunction = sinon.spy();

			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			assert.deepEqual(pageBreakBeforeFunction.getCall(0).args[0].startPosition, { pageNumber: 1, left: 40, top: 40, verticalRatio: 0, horizontalRatio: 0, pageOrientation: 'portrait', pageInnerHeight: 720, pageInnerWidth: 320 });
		});

		it('should provide the pageOrientation of the node', function () {
			docStructure = [
				{ text: 'Text 1 (Page 1)', id: 'text1', pageOrientation: 'landscape', style: 'super-text' }
			];

			pageBreakBeforeFunction = sinon.spy();

			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			assert.deepEqual(pageBreakBeforeFunction.getCall(1).args[0].pageOrientation, 'landscape');
			assert.deepEqual(pageBreakBeforeFunction.getCall(1).args[0].style, 'super-text');
		});

		it('should work with all specified elements', function () {

			docStructure = [
				{ text: '', id: 'not-called-because-empty' },
				{ text: 'Text 1 (Page 1)', id: 'text' },
				{
					id: 'table',
					table: {
						body: [
							[{
								text: 'Column 1 (Page 1)'
							}]
						]
					}
				},
				{ id: 'ul', ul: [{ text: 'ul Item', id: 'ul-item' }] },
				{ id: 'ol', ol: [{ text: 'ol Item', id: 'ol-item' }] },
				{ id: 'image', image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD//gATQ3JlYXRlZCB3aXRoIEdJTVD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wgARCAABAAEDAREAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACP/EABQBAQAAAAAAAAAAAAAAAAAAAAX/2gAMAwEAAhADEAAAATY4f//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEABj8Cf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8hf//aAAwDAQACAAMAAAAQn//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Qf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Qf//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAT8Qf//Z' },
				{ id: 'qr', qr: 'http://www.thoughtworks.com/join' },
				{ id: 'canvas', canvas: [{ type: 'rect', x: 0, y: 0, w: 10, h: 10 }] },
				{ id: 'columns', columns: [{ text: 'column item', id: 'column-item' }] }

			];

			pageBreakBeforeFunction = sinon.spy();

			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			function validateCalled(callIndex, nodeType, id) {
				var nodeInfo = pageBreakBeforeFunction.getCall(callIndex).args[0];
				assert.equal(nodeInfo.id, id);
				assert(nodeInfo[nodeType], 'node type accessor ' + nodeType + ' not defined');
				assert(isObject(nodeInfo.startPosition), 'start position is not an object but ' + toString(nodeInfo.startPosition));
				assert(isArray(nodeInfo.pageNumbers), 'page numbers is not an array but ' + toString(nodeInfo.pageNumbers));
			}

			var textIndex = 1;
			validateCalled(textIndex, 'text', 'text');

			var tableIndex = textIndex + 1;
			validateCalled(tableIndex, 'table', 'table');

			var ulIndex = tableIndex + 2;
			validateCalled(ulIndex, 'ul', 'ul');
			validateCalled(ulIndex + 1, 'text', 'ul-item');

			var olIndex = ulIndex + 2;
			validateCalled(olIndex, 'ol', 'ol');
			validateCalled(olIndex + 1, 'text', 'ol-item');

			var imageIndex = olIndex + 2;
			validateCalled(imageIndex, 'image', 'image');

			var qrIndex = imageIndex + 1;
			validateCalled(qrIndex, 'qr', 'qr');

			var canvasIndex = qrIndex + 1;
			validateCalled(canvasIndex, 'canvas', 'canvas');

			var columnIndex = canvasIndex + 1;
			validateCalled(columnIndex, 'columns', 'columns');
			validateCalled(columnIndex + 1, 'text', 'column-item');

		});

		it('should provide all page numbers of the node', function () {
			var eightyLineBreaks = new Array(80).join("\n");
			docStructure = [
				{ text: 'Text 1 (Page 1)', id: 'text1' },
				{ text: 'Text 2 (Page 1 & 2)' + eightyLineBreaks, id: 'text2' },
				{ text: 'Text 3 (Page 2)', id: 'text3' }
			];

			pageBreakBeforeFunction = sinon.spy();

			builder.layoutDocument(docStructure, pdfDocument, styleDictionary, defaultStyle, background, header, footer, watermark, pageBreakBeforeFunction);

			assert.deepEqual(pageBreakBeforeFunction.getCall(1).args[0].pageNumbers, [1]);
			assert.deepEqual(pageBreakBeforeFunction.getCall(2).args[0].pageNumbers, [1, 2]);
			assert.deepEqual(pageBreakBeforeFunction.getCall(3).args[0].pageNumbers, [2]);
		});
	});

	describe('table of content', function () {
		it('should render empty ToC', function () {
			var desc = [
				{
					toc: {
						title: { text: 'INDEX' }
					}
				}
			];

			var pages = builder.layoutDocument(desc, sampleTestProvider);

			assert.equal(pages.length, 1);
		});
	});
});
