/*eslint no-unused-vars: ["error", {"args": "none"}]*/

import {isFunction, isString, isNumber, isBoolean, isArray} from './helpers';
import FontProvider from './fontProvider';
import LayoutBuilder from './layoutBuilder';
import sizes from './standardPageSizes';
import ImageMeasure from './imageMeasure';
import textDecorator from './textDecorator';
import TextTools from './textTools';
import PdfKit from 'pdfkit';

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
		let pageSize = fixPageSize(docDefinition.pageSize, docDefinition.pageOrientation);
		let compressPdf = isBoolean(docDefinition.compress) ? docDefinition.compress : true;

		this.pdfKitDoc = new PdfKit({size: [pageSize.width, pageSize.height], autoFirstPage: false, compress: compressPdf});
		setMetadata(docDefinition, this.pdfKitDoc);

		this.fontProvider = new FontProvider(this.fontDescriptors, this.pdfKitDoc);

		docDefinition.images = docDefinition.images || {};

		let builder = new LayoutBuilder(pageSize, fixPageMargins(docDefinition.pageMargins || 40), new ImageMeasure(this.pdfKitDoc, docDefinition.images));

		registerDefaultTableLayouts(builder);
		if (options.tableLayouts) {
			builder.registerTableLayouts(options.tableLayouts);
		}

		let pages = builder.layoutDocument(docDefinition.content, this.fontProvider, docDefinition.styles || {}, docDefinition.defaultStyle || {fontSize: 12, font: 'Roboto'}, docDefinition.background, docDefinition.header, docDefinition.footer, docDefinition.images, docDefinition.watermark, docDefinition.pageBreakBefore);
		let maxNumberPages = docDefinition.maxPagesNumber || -1;
		if (isNumber(maxNumberPages) && maxNumberPages > -1) {
			pages = pages.slice(0, maxNumberPages);
		}

		// if pageSize.height is set to Infinity, calculate the actual height of the page that
		// was laid out using the height of each of the items in the page.
		if (pageSize.height === Infinity) {
			let pageHeight = calculatePageHeight(pages, docDefinition.pageMargins);
			this.pdfKitDoc.options.size = [pageSize.width, pageHeight];
		}

		renderPages(pages, this.fontProvider, this.pdfKitDoc, options.progressCallback);

		return this.pdfKitDoc;
	}
}

function setMetadata(docDefinition, pdfKitDoc) {
	// PDF standard has these properties reserved: Title, Author, Subject, Keywords,
	// Creator, Producer, CreationDate, ModDate, Trapped.
	// To keep the pdfmake api consistent, the info field are defined lowercase.
	// Custom properties don't contain a space.
	function standardizePropertyKey(key) {
		let standardProperties = ['Title', 'Author', 'Subject', 'Keywords',
			'Creator', 'Producer', 'CreationDate', 'ModDate', 'Trapped'];
		let standardizedKey = key.charAt(0).toUpperCase() + key.slice(1);
		if (standardProperties.indexOf(standardizedKey) !== -1) {
			return standardizedKey;
		}

		return key.replace(/\s+/g, '');
	}

	pdfKitDoc.info.Producer = 'pdfmake';
	pdfKitDoc.info.Creator = 'pdfmake';

	if (docDefinition.info) {
		for (let key in docDefinition.info) {
			let value = docDefinition.info[key];
			if (value) {
				key = standardizePropertyKey(key);
				pdfKitDoc.info[key] = value;
			}
		}
	}
}

function calculatePageHeight(pages, margins) {
	function getItemHeight(item) {
		if (isFunction(item.item.getHeight)) {
			return item.item.getHeight();
		} else if (item.item._height) {
			return item.item._height;
		} else {
			// TODO: add support for next item types
			return 0;
		}
	}

	let fixedMargins = fixPageMargins(margins || 40);
	let height = fixedMargins.top + fixedMargins.bottom;
	pages.forEach((page) => {
		page.items.forEach((item) => {
			height += getItemHeight(item);
		});
	});
	return height;
}

function fixPageSize(pageSize, pageOrientation) {
	function isNeedSwapPageSizes(pageOrientation) {
		if (isString(pageOrientation)) {
			pageOrientation = pageOrientation.toLowerCase();
			return ((pageOrientation === 'portrait') && (size.width > size.height)) ||
				((pageOrientation === 'landscape') && (size.width < size.height));
		}
		return false;
	}

	// if pageSize.height is set to auto, set the height to infinity so there are no page breaks.
	if (pageSize && pageSize.height === 'auto') {
		pageSize.height = Infinity;
	}

	let size = pageSize2widthAndHeight(pageSize || 'A4');
	if (isNeedSwapPageSizes(pageOrientation)) { // swap page sizes
		size = {width: size.height, height: size.width};
	}
	size.orientation = size.width > size.height ? 'landscape' : 'portrait';
	return size;
}

function fixPageMargins(margin) {
	if (!margin) {
		return null;
	}

	if (isNumber(margin)) {
		margin = {left: margin, right: margin, top: margin, bottom: margin};
	} else if (isArray(margin)) {
		if (margin.length === 2) {
			margin = {left: margin[0], top: margin[1], right: margin[0], bottom: margin[1]};
		} else if (margin.length === 4) {
			margin = {left: margin[0], top: margin[1], right: margin[2], bottom: margin[3]};
		} else {
			throw 'Invalid pageMargins definition';
		}
	}

	return margin;
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

function pageSize2widthAndHeight(pageSize) {
	if (isString(pageSize)) {
		let size = sizes[pageSize.toUpperCase()];
		if (!size) {
			throw `Page size ${pageSize} not recognized`;
		}
		return {width: size[0], height: size[1]};
	}

	return pageSize;
}

function updatePageOrientationInOptions(currentPage, pdfKitDoc) {
	let previousPageOrientation = pdfKitDoc.options.size[0] > pdfKitDoc.options.size[1] ? 'landscape' : 'portrait';

	if (currentPage.pageSize.orientation !== previousPageOrientation) {
		let width = pdfKitDoc.options.size[0];
		let height = pdfKitDoc.options.size[1];
		pdfKitDoc.options.size = [height, width];
	}
}

function renderPages(pages, fontProvider, pdfKitDoc, progressCallback) {
	pdfKitDoc._pdfMakePages = pages;
	pdfKitDoc.addPage();

	let totalItems = 0;
	if (progressCallback) {
		pages.forEach((page) => {
			totalItems += page.items.length;
		});
	}

	let renderedItems = 0;
	progressCallback = progressCallback || (() => {
	});

	for (let i = 0; i < pages.length; i++) {
		if (i > 0) {
			updatePageOrientationInOptions(pages[i], pdfKitDoc);
			pdfKitDoc.addPage(pdfKitDoc.options);
		}

		let page = pages[i];
		for (let ii = 0, il = page.items.length; ii < il; ii++) {
			let item = page.items[ii];
			switch (item.type) {
				case 'vector':
					renderVector(item.item, pdfKitDoc);
					break;
				case 'line':
					renderLine(item.item, item.item.x, item.item.y, pdfKitDoc);
					break;
				case 'image':
					renderImage(item.item, item.item.x, item.item.y, pdfKitDoc);
					break;
				case 'beginClip':
					beginClip(item.item, pdfKitDoc);
					break;
				case 'endClip':
					endClip(pdfKitDoc);
					break;
			}
			renderedItems++;
			progressCallback(renderedItems / totalItems);
		}
		if (page.watermark) {
			renderWatermark(page, pdfKitDoc);
		}
	}
}

function renderLine(line, x, y, pdfKitDoc) {
	if (line._pageNodeRef) {
		let newWidth;
		let diffWidth;
		let textTools = new TextTools(null);
		let pageNumber = line._pageNodeRef.positions[0].pageNumber.toString();

		line.inlines[0].text = pageNumber;
		line.inlines[0].linkToPage = pageNumber;
		newWidth = textTools.widthOfString(line.inlines[0].text, line.inlines[0].font, line.inlines[0].fontSize, line.inlines[0].characterSpacing, line.inlines[0].fontFeatures);
		diffWidth = line.inlines[0].width - newWidth;
		line.inlines[0].width = newWidth;

		switch (line.inlines[0].alignment) {
			case 'right':
				line.inlines[0].x += diffWidth;
				break;
			case 'center':
				line.inlines[0].x += diffWidth / 2;
				break;
		}
	}

	x = x || 0;
	y = y || 0;

	let lineHeight = line.getHeight();
	let ascenderHeight = line.getAscenderHeight();
	let descent = lineHeight - ascenderHeight;

	textDecorator.drawBackground(line, x, y, pdfKitDoc);

	//TODO: line.optimizeInlines();
	for (let i = 0, l = line.inlines.length; i < l; i++) {
		let inline = line.inlines[i];
		let shiftToBaseline = lineHeight - ((inline.font.ascender / 1000) * inline.fontSize) - descent;
		let options = {
			lineBreak: false,
			textWidth: inline.width,
			characterSpacing: inline.characterSpacing,
			wordCount: 1,
			link: inline.link
		};

		if (inline.fontFeatures) {
			options.features = inline.fontFeatures;
		}

		pdfKitDoc.fill(inline.color || 'black');

		pdfKitDoc._font = inline.font;
		pdfKitDoc.fontSize(inline.fontSize);
		pdfKitDoc.text(inline.text, x + inline.x, y + shiftToBaseline, options);

		if (inline.linkToPage) {
			let _ref = pdfKitDoc.ref({Type: 'Action', S: 'GoTo', D: [inline.linkToPage, 0, 0]}).end();
			pdfKitDoc.annotate(x + inline.x, y + shiftToBaseline, inline.width, inline.height, {Subtype: 'Link', Dest: [inline.linkToPage - 1, 'XYZ', null, null, null]});
		}

	}

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

function renderVector(vector, pdfKitDoc) {
	//TODO: pdf optimization (there's no need to write all properties everytime)
	pdfKitDoc.lineWidth(vector.lineWidth || 1);
	if (vector.dash) {
		pdfKitDoc.dash(vector.dash.length, {space: vector.dash.space || vector.dash.length, phase: vector.dash.phase || 0});
	} else {
		pdfKitDoc.undash();
	}
	pdfKitDoc.lineJoin(vector.lineJoin || 'miter');
	pdfKitDoc.lineCap(vector.lineCap || 'butt');

	//TODO: clipping

	switch (vector.type) {
		case 'ellipse':
			pdfKitDoc.ellipse(vector.x, vector.y, vector.r1, vector.r2);
			break;
		case 'rect':
			if (vector.r) {
				pdfKitDoc.roundedRect(vector.x, vector.y, vector.w, vector.h, vector.r);
			} else {
				pdfKitDoc.rect(vector.x, vector.y, vector.w, vector.h);
			}

			if (vector.linearGradient) {
				let gradient = pdfKitDoc.linearGradient(vector.x, vector.y, vector.x + vector.w, vector.y);
				let step = 1 / (vector.linearGradient.length - 1);

				for (let i = 0; i < vector.linearGradient.length; i++) {
					gradient.stop(i * step, vector.linearGradient[i]);
				}

				vector.color = gradient;
			}
			break;
		case 'line':
			pdfKitDoc.moveTo(vector.x1, vector.y1);
			pdfKitDoc.lineTo(vector.x2, vector.y2);
			break;
		case 'polyline':
			if (vector.points.length === 0) {
				break;
			}

			pdfKitDoc.moveTo(vector.points[0].x, vector.points[0].y);
			for (let i = 1, l = vector.points.length; i < l; i++) {
				pdfKitDoc.lineTo(vector.points[i].x, vector.points[i].y);
			}

			if (vector.points.length > 1) {
				let p1 = vector.points[0];
				let pn = vector.points[vector.points.length - 1];

				if (vector.closePath || p1.x === pn.x && p1.y === pn.y) {
					pdfKitDoc.closePath();
				}
			}
			break;
		case 'path':
			pdfKitDoc.path(vector.d);
			break;
	}

	if (vector.color && vector.lineColor) {
		pdfKitDoc.fillColor(vector.color, vector.fillOpacity || 1);
		pdfKitDoc.strokeColor(vector.lineColor, vector.strokeOpacity || 1);
		pdfKitDoc.fillAndStroke();
	} else if (vector.color) {
		pdfKitDoc.fillColor(vector.color, vector.fillOpacity || 1);
		pdfKitDoc.fill();
	} else {
		pdfKitDoc.strokeColor(vector.lineColor || 'black', vector.strokeOpacity || 1);
		pdfKitDoc.stroke();
	}
}

function renderImage(image, x, y, pdfKitDoc) {
	pdfKitDoc.image(image.image, image.x, image.y, {width: image._width, height: image._height});
	if (image.link) {
		pdfKitDoc.link(image.x, image.y, image._width, image._height, image.link);
	}
}

function beginClip(rect, pdfKitDoc) {
	pdfKitDoc.save();
	pdfKitDoc.addContent('' + rect.x + ' ' + rect.y + ' ' + rect.width + ' ' + rect.height + ' re');
	pdfKitDoc.clip();
}

function endClip(pdfKitDoc) {
	pdfKitDoc.restore();
}

export default PdfPrinter;
