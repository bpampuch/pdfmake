/* jslint node: true */
'use strict';

var _ = require('lodash');
var FontProvider = require('./fontProvider');
var LayoutBuilder = require('./layoutBuilder');
var PdfKit = require('pdfkit');
var sizes = require('./standardPageSizes');
var ImageMeasure = require('./imageMeasure');
var textDecorator = require('./textDecorator');
var TextTools = require('./textTools');

_.noConflict();

////////////////////////////////////////
// PdfPrinter

/**
 * @class Creates an instance of a PdfPrinter which turns document definition into a pdf
 *
 * @param {Object} fontDescriptors font definition dictionary
 *
 * @example
 * var fontDescriptors = {
 *	Roboto: {
 *		normal: 'fonts/Roboto-Regular.ttf',
 *		bold: 'fonts/Roboto-Medium.ttf',
 *		italics: 'fonts/Roboto-Italic.ttf',
 *		bolditalics: 'fonts/Roboto-MediumItalic.ttf'
 *	}
 * };
 *
 * var printer = new PdfPrinter(fontDescriptors);
 */
function PdfPrinter(fontDescriptors) {
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
 * var docDefinition = {
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
 * var pdfKitDoc = printer.createPdfKitDocument(docDefinition);
 *
 * pdfKitDoc.pipe(fs.createWriteStream('sample.pdf'));
 * pdfKitDoc.end();
 *
 * @return {Object} a pdfKit document object which can be saved or encode to data-url
 */
PdfPrinter.prototype.createPdfKitDocument = function (docDefinition, options) {
	options = options || {};

	var pageSize = fixPageSize(docDefinition.pageSize, docDefinition.pageOrientation);

	this.pdfKitDoc = new PdfKit({size: [pageSize.width, pageSize.height], autoFirstPage: false, compress: docDefinition.compress || true});
	setMetadata(docDefinition, this.pdfKitDoc);

	this.fontProvider = new FontProvider(this.fontDescriptors, this.pdfKitDoc);

	docDefinition.images = docDefinition.images || {};

	var builder = new LayoutBuilder(pageSize, fixPageMargins(docDefinition.pageMargins || 40), new ImageMeasure(this.pdfKitDoc, docDefinition.images));

	registerDefaultTableLayouts(builder);
	if (options.tableLayouts) {
		builder.registerTableLayouts(options.tableLayouts);
	}

	var pages = builder.layoutDocument(docDefinition.content, this.fontProvider, docDefinition.styles || {}, docDefinition.defaultStyle || {fontSize: 12, font: 'Roboto'}, docDefinition.background, docDefinition.header, docDefinition.footer, docDefinition.images, docDefinition.watermark, docDefinition.pageBreakBefore);
	var maxNumberPages = docDefinition.maxPagesNumber || -1;
	if (typeof maxNumberPages === 'number' && maxNumberPages > -1) {
		pages = pages.slice(0, maxNumberPages);
	}

	// if pageSize.height is set to Infinity, calculate the actual height of the page that
	// was laid out using the height of each of the items in the page.
	if (pageSize.height === Infinity) {
		var pageHeight = calculatePageHeight(pages, docDefinition.pageMargins);
		this.pdfKitDoc.options.size = [pageSize.width, pageHeight];
	}

	renderPages(pages, this.fontProvider, this.pdfKitDoc, options.progressCallback);

	if (options.autoPrint) {
		var printActionRef = this.pdfKitDoc.ref({
			Type: 'Action',
			S: 'Named',
			N: 'Print'
		});
		this.pdfKitDoc._root.data.OpenAction = printActionRef;
		printActionRef.end();
	}
	return this.pdfKitDoc;
};

function setMetadata(docDefinition, pdfKitDoc) {
	// PDF standard has these properties reserved: Title, Author, Subject, Keywords,
	// Creator, Producer, CreationDate, ModDate, Trapped.
	// To keep the pdfmake api consistent, the info field are defined lowercase.
	// Custom properties don't contain a space.
	function standardizePropertyKey(key) {
		var standardProperties = ['Title', 'Author', 'Subject', 'Keywords',
			'Creator', 'Producer', 'CreationDate', 'ModDate', 'Trapped'];
		var standardizedKey = key.charAt(0).toUpperCase() + key.slice(1);
		if (standardProperties.indexOf(standardizedKey) !== -1) {
			return standardizedKey;
		}

		return key.replace(/\s+/g, '');
	}

	pdfKitDoc.info.Producer = 'pdfmake';
	pdfKitDoc.info.Creator = 'pdfmake';

	if (docDefinition.info) {
		for (var key in docDefinition.info) {
			var value = docDefinition.info[key];
			if (value) {
				key = standardizePropertyKey(key);
				pdfKitDoc.info[key] = value;
			}
		}
	}
}

function calculatePageHeight(pages, margins) {
	function getItemHeight(item) {
		if (typeof item.item.getHeight === 'function') {
			return item.item.getHeight();
		} else if (item.item._height) {
			return item.item._height;
		} else {
			// TODO: add support for next item types
			return 0;
		}
	}

	var fixedMargins = fixPageMargins(margins || 40);
	var height = fixedMargins.top + fixedMargins.bottom;
	pages.forEach(function (page) {
		page.items.forEach(function (item) {
			height += getItemHeight(item);
		});
	});
	return height;
}

function fixPageSize(pageSize, pageOrientation) {
	function isNeedSwapPageSizes(pageOrientation) {
		if (typeof pageOrientation === 'string' || pageOrientation instanceof String) {
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

	var size = pageSize2widthAndHeight(pageSize || 'A4');
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

	if (typeof margin === 'number' || margin instanceof Number) {
		margin = {left: margin, right: margin, top: margin, bottom: margin};
	} else if (Array.isArray(margin)) {
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
	/*jshint unused: false */
	layoutBuilder.registerTableLayouts({
		noBorders: {
			hLineWidth: function (i) {
				return 0;
			},
			vLineWidth: function (i) {
				return 0;
			},
			paddingLeft: function (i) {
				return i && 4 || 0;
			},
			paddingRight: function (i, node) {
				return (i < node.table.widths.length - 1) ? 4 : 0;
			}
		},
		headerLineOnly: {
			hLineWidth: function (i, node) {
				if (i === 0 || i === node.table.body.length) {
					return 0;
				}
				return (i === node.table.headerRows) ? 2 : 0;
			},
			vLineWidth: function (i) {
				return 0;
			},
			paddingLeft: function (i) {
				return i === 0 ? 0 : 8;
			},
			paddingRight: function (i, node) {
				return (i === node.table.widths.length - 1) ? 0 : 8;
			}
		},
		lightHorizontalLines: {
			hLineWidth: function (i, node) {
				if (i === 0 || i === node.table.body.length) {
					return 0;
				}
				return (i === node.table.headerRows) ? 2 : 1;
			},
			vLineWidth: function (i) {
				return 0;
			},
			hLineColor: function (i) {
				return i === 1 ? 'black' : '#aaa';
			},
			paddingLeft: function (i) {
				return i === 0 ? 0 : 8;
			},
			paddingRight: function (i, node) {
				return (i === node.table.widths.length - 1) ? 0 : 8;
			}
		}
	});
}

function pageSize2widthAndHeight(pageSize) {
	if (typeof pageSize === 'string' || pageSize instanceof String) {
		var size = sizes[pageSize.toUpperCase()];
		if (!size) {
			throw 'Page size ' + pageSize + ' not recognized';
		}
		return {width: size[0], height: size[1]};
	}

	return pageSize;
}

function updatePageOrientationInOptions(currentPage, pdfKitDoc) {
	var previousPageOrientation = pdfKitDoc.options.size[0] > pdfKitDoc.options.size[1] ? 'landscape' : 'portrait';

	if (currentPage.pageSize.orientation !== previousPageOrientation) {
		var width = pdfKitDoc.options.size[0];
		var height = pdfKitDoc.options.size[1];
		pdfKitDoc.options.size = [height, width];
	}
}

function renderPages(pages, fontProvider, pdfKitDoc, progressCallback) {
	pdfKitDoc._pdfMakePages = pages;
	pdfKitDoc.addPage();

	var totalItems = progressCallback && _.sumBy(pages, function (page) {
		return page.items.length;
	});
	var renderedItems = 0;
	progressCallback = progressCallback || function () {};

	for (var i = 0; i < pages.length; i++) {
		if (i > 0) {
			updatePageOrientationInOptions(pages[i], pdfKitDoc);
			pdfKitDoc.addPage(pdfKitDoc.options);
		}

		var page = pages[i];
		for (var ii = 0, il = page.items.length; ii < il; ii++) {
			var item = page.items[ii];
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
	if (line._tocItemNode) {
		var newWidth;
		var diffWidth;
		var textTools = new TextTools(null);

		line.inlines[0].text = line._tocItemNode.positions[0].pageNumber.toString();
		newWidth = textTools.widthOfString(line.inlines[0].text, line.inlines[0].font, line.inlines[0].fontSize, line.inlines[0].characterSpacing);
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

	var lineHeight = line.getHeight();
	var ascenderHeight = line.getAscenderHeight();
	var descent = lineHeight - ascenderHeight;

	textDecorator.drawBackground(line, x, y, pdfKitDoc);

	//TODO: line.optimizeInlines();
	for (var i = 0, l = line.inlines.length; i < l; i++) {
		var inline = line.inlines[i];
		var shiftToBaseline = lineHeight - ((inline.font.ascender / 1000) * inline.fontSize) - descent;

		pdfKitDoc.fill(inline.color || 'black');

		pdfKitDoc._font = inline.font;
		pdfKitDoc.fontSize(inline.fontSize);
		pdfKitDoc.text(inline.text, x + inline.x, y + shiftToBaseline, {
			lineBreak: false,
			textWidth: inline.width,
			characterSpacing: inline.characterSpacing,
			wordCount: 1,
			link: inline.link
		});

		if (inline.linkToPage) {
			var _ref = pdfKitDoc.ref({Type: 'Action', S: 'GoTo', D: [inline.linkToPage, 0, 0]}).end();
			pdfKitDoc.annotate(x + inline.x, y + shiftToBaseline, inline.width, inline.height, {Subtype: 'Link', Dest: [inline.linkToPage - 1, 'XYZ', null, null, null]});
		}

	}

	textDecorator.drawDecorations(line, x, y, pdfKitDoc);
}

function renderWatermark(page, pdfKitDoc) {
	var watermark = page.watermark;

	pdfKitDoc.fill(watermark.color);
	pdfKitDoc.opacity(watermark.opacity);

	pdfKitDoc.save();

	var angle = Math.atan2(pdfKitDoc.page.height, pdfKitDoc.page.width) * -180 / Math.PI;
	pdfKitDoc.rotate(angle, {origin: [pdfKitDoc.page.width / 2, pdfKitDoc.page.height / 2]});

	var x = pdfKitDoc.page.width / 2 - watermark.size.size.width / 2;
	var y = pdfKitDoc.page.height / 2 - watermark.size.size.height / 4;

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
				var gradient = pdfKitDoc.linearGradient(vector.x, vector.y, vector.x + vector.w, vector.y);
				var step = 1 / (vector.linearGradient.length - 1);

				for (var i = 0; i < vector.linearGradient.length; i++) {
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
			for (var i = 1, l = vector.points.length; i < l; i++) {
				pdfKitDoc.lineTo(vector.points[i].x, vector.points[i].y);
			}

			if (vector.points.length > 1) {
				var p1 = vector.points[0];
				var pn = vector.points[vector.points.length - 1];

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

module.exports = PdfPrinter;


/* temporary browser extension */
PdfPrinter.prototype.fs = require('fs');
