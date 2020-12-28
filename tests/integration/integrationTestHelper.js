'use strict';

var PdfKitEngine = require('../../src/pdfKitEngine');
var sizes = require('../../src/standardPageSizes');
var LayoutBuilder = require('../../src/layoutBuilder');
var FontProvider = require('../../src/fontProvider');
var ImageMeasure = require('../../src/imageMeasure');
var SVGMeasure = require('../../src/svgMeasure');

function IntegrationTestHelper() {
	this.MARGINS = { top: 40, left: 40, right: 40, bottom: 40 };
	this.LINE_HEIGHT = 14.0625;
	this.DEFAULT_BULLET_SPACER = '9. ';
}

IntegrationTestHelper.prototype.renderPages = function (sizeName, docDefinition) {
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

	var pdfKitDoc = PdfKitEngine.createPdfDocument({ size: [pageSize.width, pageSize.height], compress: false });
	var builder = new LayoutBuilder(
		pageSize,
		{ left: this.MARGINS.left, right: this.MARGINS.right, top: this.MARGINS.top, bottom: this.MARGINS.bottom },
		new ImageMeasure(pdfKitDoc, docDefinition.images),
		new SVGMeasure()
	);
	this.fontProvider = new FontProvider(fontDescriptors, pdfKitDoc);

	return builder.layoutDocument(
		docDefinition.content,
		this.fontProvider, docDefinition.styles || {},
		docDefinition.defaultStyle || { fontSize: 12, font: 'Roboto' },
		docDefinition.background,
		docDefinition.header,
		docDefinition.footer,
		docDefinition.images,
		docDefinition.watermark,
		docDefinition.pageBreakBefore
	);
};

IntegrationTestHelper.prototype.getInlineTexts = function (pages, options) {
	return pages[options.page].items[options.item].item.inlines.map(inline => inline.text);
};

IntegrationTestHelper.prototype.getWidthOfString = function (inlines) {
	return this.fontProvider.fontCache['Roboto'].normal.widthOfString(inlines, 12);
};


module.exports = IntegrationTestHelper;
