'use strict';

var PDFDocument = require('../../js/PDFDocument').default;
var sizes = require('../../js/standardPageSizes').default;
var LayoutBuilder = require('../../js/LayoutBuilder').default;
var SVGMeasure = require('../../js/SVGMeasure').default;

class IntegrationTestHelper {
	constructor(options = {}) {
		this.MARGINS = options.margins || { top: 40, left: 40, right: 40, bottom: 40 };
		this.LINE_HEIGHT = 14.0625;
		this.DEFAULT_BULLET_SPACER = '9. ';
	}

	renderPages(sizeName, docDefinition) {
		var size = sizes[sizeName];
		docDefinition.images = docDefinition.images || {};
		docDefinition.attachments = docDefinition.attachments || {};
		var fontDescriptors = {
			Roboto: {
				normal: 'tests/fonts/Roboto-Regular.ttf',
				bold: 'tests/fonts/Roboto-Medium.ttf',
				italics: 'tests/fonts/Roboto-Italic.ttf',
				bolditalics: 'tests/fonts/Roboto-Italic.ttf'
			}
		};

		var pageSize = { width: size[0], height: size[1], orientation: 'portrait' };

		this.pdfDocument = new PDFDocument(fontDescriptors, docDefinition.images, docDefinition.attachments, { size: [pageSize.width, pageSize.height], compress: false });
		var builder = new LayoutBuilder(pageSize, this.MARGINS, new SVGMeasure());

		return builder.layoutDocument(
			docDefinition.content,
			this.pdfDocument, docDefinition.styles || {},
			docDefinition.defaultStyle || { fontSize: 12, font: 'Roboto' },
			docDefinition.background,
			docDefinition.header,
			docDefinition.footer,
			docDefinition.images,
			docDefinition.watermark,
			docDefinition.pageBreakBefore
		);
	}

	getInlineTexts(pages, options) {
		return pages[options.page].items[options.item].item.inlines.map(inline => inline.text);
	}

	getWidthOfString(inlines) {
		return this.pdfDocument.fontCache['Roboto'].normal.widthOfString(inlines, 12);
	}
}

module.exports = IntegrationTestHelper;
