var PDFDocument = require('../../js/PDFDocument').default;
var LayoutBuilder = require('../../js/LayoutBuilder').default;
var sizes = require('../../js/standardPageSizes').default;
var defaults = require('../../js/defaults').default;

class IntegrationTestHelper {

	constructor() {
		this.MARGINS = { top: 40, left: 40, right: 40, bottom: 40 };
		this.LINE_HEIGHT = 14.0625;
		this.DEFAULT_BULLET_SPACER = '9. ';
	}

	renderPages(pageSizeName, docDefinition) {
		var fonts = {
			Roboto: {
				normal: 'fonts/Roboto-Regular.ttf',
				bold: 'fonts/Roboto-Medium.ttf',
				italics: 'fonts/Roboto-Italic.ttf',
				bolditalics: 'fonts/Roboto-MediumItalic.ttf'
			}
		};

		docDefinition.images = docDefinition.images || {};
		docDefinition.styles = docDefinition.styles || {};
		docDefinition.defaultStyle = docDefinition.defaultStyle || { font: defaults.font, fontSize: defaults.fontSize };

		var size = sizes[pageSizeName];
		var pageSize = { width: size[0], height: size[1], orientation: 'portrait' };

		let pdfOptions = {
			size: [pageSize.width, pageSize.height],
			compress: false,
			autoFirstPage: false
		};
		this.pdfDocument = new PDFDocument(fonts, docDefinition.images, pdfOptions);

		let builder = new LayoutBuilder(this.pdfDocument, pageSize, { left: this.MARGINS.left, right: this.MARGINS.right, top: this.MARGINS.top, bottom: this.MARGINS.bottom });
		let pages = builder.buildDocument(docDefinition);

		return pages;
	}

	getInlineTexts(pages, options) {
		return pages[options.page].items[options.item].item.inlines.map(inline => inline.text);
	}

	getWidthOfString(inlines) {
		return this.pdfDocument.fontCache['Roboto'].normal.widthOfString(inlines, 12);
	}

}

module.exports = IntegrationTestHelper;
