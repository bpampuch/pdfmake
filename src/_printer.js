/*eslint no-unused-vars: ["error", {"args": "none"}]*/

import {isUndefined} from './helpers';
import LayoutBuilder from './layoutBuilder';
import textDecorator from './textDecorator';
import TextTools from './textTools';

////////////////////////////////////////
// PdfPrinter

/**
 * Turns document definition into a pdf
 *
 * @example
 * let fontDescriptors = {
 *	Roboto: {
 *		normal: 'fonts/Roboto-Regular.ttf',
 *		bold: 'fonts/Roboto-Medium.ttf',
 *		italics: 'fonts/Roboto-Italic.ttf',
 *		bolditalics: 'fonts/Roboto-MediumItalic.ttf'
 *	}
 * };
 *
 * let printer = new PdfPrinter(fontDescriptors);
 */
class PdfPrinter {

	/**
	 * @param {Object} fontDescriptors font definition dictionary
	 */
	constructor(fontDescriptors) {
		this.fontDescriptors = fontDescriptors;
	}

	/**
	 * Executes layout engine for the specified document and renders it into a pdfkit document
	 * ready to be saved.
	 *
	 * @param {Object} docDefinition document definition
	 * @param {Object} docDefinition.content an array describing the pdf structure (for more information take a look at the examples in the /examples folder)
	 * @param {Object} [docDefinition.defaultStyle] default (implicit) style definition
	 * @param {Object} [docDefinition.styles] dictionary defining all styles which can be used in the document
	 * @param {Object} [docDefinition.pageSize] page size (pdfkit units, A4 dimensions by default)
	 * @param {Number} docDefinition.pageSize.width width
	 * @param {Number} docDefinition.pageSize.height height
	 * @param {Object} [docDefinition.pageMargins] page margins (pdfkit units)
	 * @param {Number} docDefinition.maxPagesNumber maximum number of pages to render
	 *
	 * @example
	 *
	 * let docDefinition = {
	 * 	info: {
	 *		title: 'awesome Document',
	 *		author: 'john doe',
	 *		subject: 'subject of document',
	 *		keywords: 'keywords for document',
	 * 	},
	 *	content: [
	 *		'First paragraph',
	 *		'Second paragraph, this time a little bit longer',
	 *		{ text: 'Third paragraph, slightly bigger font size', fontSize: 20 },
	 *		{ text: 'Another paragraph using a named style', style: 'header' },
	 *		{ text: ['playing with ', 'inlines' ] },
	 *		{ text: ['and ', { text: 'restyling ', bold: true }, 'them'] },
	 *	],
	 *	styles: {
	 *		header: { fontSize: 30, bold: true }
	 *	}
	 * }
	 *
	 * let pdfKitDoc = printer.createPdfKitDocument(docDefinition);
	 *
	 * pdfKitDoc.pipe(fs.createWriteStream('sample.pdf'));
	 * pdfKitDoc.end();
	 *
	 * @return {Object} a pdfKit document object which can be saved or encode to data-url
	 */
	createPdfKitDocument(docDefinition, options = {}) {


		let builder = new LayoutBuilder(pageSize, /*fixPageMargins(*/docDefinition.pageMargins /*|| 40)*//*, new ImageMeasure(this.pdfKitDoc, docDefinition.images)*/);

		registerDefaultTableLayouts(builder);
		if (options.tableLayouts) {
			builder.registerTableLayouts(options.tableLayouts);
		}

		let pages = builder.layoutDocument(docDefinition.content, this.fontProvider, docDefinition.styles /*|| {}*/, docDefinition.defaultStyle /*|| {fontSize: 12, font: 'Roboto'}*/, docDefinition.background, docDefinition.header, docDefinition.footer, docDefinition.images, docDefinition.watermark, docDefinition.pageBreakBefore);

		renderPages(pages, this.fontProvider, this.pdfKitDoc/*, options.progressCallback*/);

		return this.pdfKitDoc;
	}
}


function registerDefaultTableLayouts(layoutBuilder) {
	layoutBuilder.registerTableLayouts({
		noBorders: {
			hLineWidth(i) {
				return 0;
			},
			vLineWidth(i) {
				return 0;
			},
			paddingLeft(i) {
				return i && 4 || 0;
			},
			paddingRight(i, node) {
				return (i < node.table.widths.length - 1) ? 4 : 0;
			}
		},
		headerLineOnly: {
			hLineWidth(i, node) {
				if (i === 0 || i === node.table.body.length) {
					return 0;
				}
				return (i === node.table.headerRows) ? 2 : 0;
			},
			vLineWidth(i) {
				return 0;
			},
			paddingLeft(i) {
				return i === 0 ? 0 : 8;
			},
			paddingRight(i, node) {
				return (i === node.table.widths.length - 1) ? 0 : 8;
			}
		},
		lightHorizontalLines: {
			hLineWidth(i, node) {
				if (i === 0 || i === node.table.body.length) {
					return 0;
				}
				return (i === node.table.headerRows) ? 2 : 1;
			},
			vLineWidth(i) {
				return 0;
			},
			hLineColor(i) {
				return i === 1 ? 'black' : '#aaa';
			},
			paddingLeft(i) {
				return i === 0 ? 0 : 8;
			},
			paddingRight(i, node) {
				return (i === node.table.widths.length - 1) ? 0 : 8;
			}
		}
	});
}


function renderPages(pages, fontProvider, pdfKitDoc, progressCallback) {

	for (let i = 0; i < pages.length; i++) {

		if (page.watermark) {
			renderWatermark(page, pdfKitDoc);
		}
	}
}

function renderLine(line, x, y, pdfKitDoc) {

	textDecorator.drawBackground(line, x, y, pdfKitDoc);

	// ...

	textDecorator.drawDecorations(line, x, y, pdfKitDoc);
}

function renderWatermark(page, pdfKitDoc) {
	let watermark = page.watermark;

	pdfKitDoc.fill(watermark.color);
	pdfKitDoc.opacity(watermark.opacity);

	pdfKitDoc.save();

	let angle = Math.atan2(pdfKitDoc.page.height, pdfKitDoc.page.width) * -180 / Math.PI;
	pdfKitDoc.rotate(angle, {origin: [pdfKitDoc.page.width / 2, pdfKitDoc.page.height / 2]});

	let x = pdfKitDoc.page.width / 2 - watermark.size.size.width / 2;
	let y = pdfKitDoc.page.height / 2 - watermark.size.size.height / 4;

	pdfKitDoc._font = watermark.font;
	pdfKitDoc.fontSize(watermark.size.fontSize);
	pdfKitDoc.text(watermark.text, x, y, {lineBreak: false});

	pdfKitDoc.restore();
}

export default PdfPrinter;
