/*eslint no-unused-vars: ["error", {"args": "none"}]*/
'use strict';

var PdfKitEngine = require('./pdfKitEngine');
var FontProvider = require('./fontProvider');
var LayoutBuilder = require('./layoutBuilder');
var sizes = require('./standardPageSizes');
var ImageMeasure = require('./imageMeasure');
var SVGMeasure = require('./svgMeasure');
var textDecorator = require('./textDecorator');
var TextTools = require('./textTools');
var isFunction = require('./helpers').isFunction;
var isString = require('./helpers').isString;
var isNumber = require('./helpers').isNumber;
var isBoolean = require('./helpers').isBoolean;
var isArray = require('./helpers').isArray;
var isUndefined = require('./helpers').isUndefined;
var isPattern = require('./helpers').isPattern;
var getPattern = require('./helpers').getPattern;
var SVGtoPDF = require('./3rd-party/svg-to-pdfkit');

var REMOTE_RESOLVED_KEY = '__pdfMakeRemoteImagesResolved';
var REMOTE_PROTOCOL_REGEX = /^https?:\/\//i;
var DATA_URL_REGEX = /^data:/i;
var TRANSPARENT_PNG_PLACEHOLDER = (typeof Buffer !== 'undefined') ? Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWM8c+bMfQAI1gP2Ce279wAAAABJRU5ErkJggg==', 'base64') : null;

var findFont = function (fonts, requiredFonts, defaultFont) {
	for (var i = 0; i < requiredFonts.length; i++) {
		var requiredFont = requiredFonts[i].toLowerCase();

		for (var font in fonts) {
			if (font.toLowerCase() === requiredFont) {
				return font;
			}
		}
	}

	return defaultFont;
};

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
	this._remoteImageCache = new Map();
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
 *	},
 *	patterns: {
 *		stripe45d: {
 *			boundingBox: [1, 1, 4, 4],
 *			xStep: 3,
 *			yStep: 3,
 *			pattern: '1 w 0 1 m 4 5 l s 2 0 m 5 3 l s'
 *		}
 *	}
 * };
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

	docDefinition.version = docDefinition.version || '1.3';
	docDefinition.subset = docDefinition.subset || undefined;
	docDefinition.tagged = typeof docDefinition.tagged === 'boolean' ? docDefinition.tagged : false;
	docDefinition.displayTitle = typeof docDefinition.displayTitle === 'boolean' ? docDefinition.displayTitle : false;
	docDefinition.compress = isBoolean(docDefinition.compress) ? docDefinition.compress : true;
	docDefinition.images = docDefinition.images || {};
	docDefinition.pageMargins = ((docDefinition.pageMargins !== undefined) && (docDefinition.pageMargins !== null)) ? docDefinition.pageMargins : 40;

	var pageSize = fixPageSize(docDefinition.pageSize, docDefinition.pageOrientation);

	var pdfOptions = {
		size: [pageSize.width, pageSize.height],
		pdfVersion: docDefinition.version,
		subset: docDefinition.subset,
		tagged: docDefinition.tagged,
		displayTitle: docDefinition.displayTitle,
		compress: docDefinition.compress,
		userPassword: docDefinition.userPassword,
		ownerPassword: docDefinition.ownerPassword,
		permissions: docDefinition.permissions,
		lang: docDefinition.language,
		fontLayoutCache: isBoolean(options.fontLayoutCache) ? options.fontLayoutCache : true,
		bufferPages: options.bufferPages || false,
		autoFirstPage: false,
		info: createMetadata(docDefinition),
		font: null
	};

	this.pdfKitDoc = PdfKitEngine.createPdfDocument(pdfOptions);

	this.fontProvider = new FontProvider(this.fontDescriptors, this.pdfKitDoc);

	var builder = new LayoutBuilder(pageSize, fixPageMargins(docDefinition.pageMargins), new ImageMeasure(this.pdfKitDoc, docDefinition.images), new SVGMeasure());

	if (docDefinition.footerGapOption !== undefined) {
		builder.applyFooterGapOption(docDefinition.footerGapOption);
	}

	registerDefaultTableLayouts(builder);
	if (options.tableLayouts) {
		builder.registerTableLayouts(options.tableLayouts);
	}

	var pages = builder.layoutDocument(docDefinition.content, this.fontProvider, docDefinition.styles || {}, docDefinition.defaultStyle || {
		fontSize: 12,
		font: 'Roboto'
	}, docDefinition.background, docDefinition.header, docDefinition.footer, docDefinition.images, docDefinition.watermark, docDefinition.pageBreakBefore);
	var maxNumberPages = docDefinition.maxPagesNumber || -1;
	if (isNumber(maxNumberPages) && maxNumberPages > -1) {
		pages = pages.slice(0, maxNumberPages);
	}

	// if pageSize.height is set to Infinity, calculate the actual height of the page that
	// was laid out using the height of each of the items in the page.
	if (pageSize.height === Infinity) {
		var pageHeight = calculatePageHeight(pages, docDefinition.pageMargins);
		this.pdfKitDoc.options.size = [pageSize.width, pageHeight];
	}

	var patterns = createPatterns(docDefinition.patterns || {}, this.pdfKitDoc);

	renderPages(pages, this.fontProvider, this.pdfKitDoc, patterns, options.progressCallback);

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

PdfPrinter.prototype.resolveRemoteImages = function (docDefinition, timeoutMs) {
	return resolveRemoteImages.call(this, docDefinition, timeoutMs);
};

PdfPrinter.prototype.createPdfKitDocumentAsync = function (docDefinition, options) {
	var createOptions = options ? Object.assign({}, options) : {};
	var timeout;
	if (Object.prototype.hasOwnProperty.call(createOptions, 'remoteImageTimeout')) {
		timeout = createOptions.remoteImageTimeout;
		delete createOptions.remoteImageTimeout;
	}

	var self = this;
	return resolveRemoteImages.call(this, docDefinition, timeout).then(function () {
		return self.createPdfKitDocument(docDefinition, createOptions);
	});
};

function createMetadata(docDefinition) {
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

	var info = {
		Producer: 'pdfmake',
		Creator: 'pdfmake'
	};

	if (docDefinition.info) {
		for (var key in docDefinition.info) {
			var value = docDefinition.info[key];
			if (value) {
				key = standardizePropertyKey(key);
				info[key] = value;
			}
		}
	}
	return info;
}

function calculatePageHeight(pages, margins) {
	function getItemHeight(item) {
		if (isFunction(item.item.getHeight)) {
			return item.item.getHeight();
		} else if (item.item._height) {
			return item.item._height;
		} else if (item.type === 'vector') {
			if (typeof item.item.y1 !== 'undefined') {
				return item.item.y1 > item.item.y2 ? item.item.y1 : item.item.y2;
			} else {
				return item.item.h;
			}
		} else {
			// TODO: add support for next item types
			return 0;
		}
	}

	function getBottomPosition(item) {
		var top = item.item.y || 0;
		var height = getItemHeight(item);
		return top + height;
	}

	var fixedMargins = fixPageMargins(margins || 40);
	var height = fixedMargins.top;

	pages.forEach(function (page) {
		page.items.forEach(function (item) {
			var bottomPosition = getBottomPosition(item);
			if (bottomPosition > height) {
				height = bottomPosition;
			}
		});
	});

	height += fixedMargins.bottom;

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

	var size = pageSize2widthAndHeight(pageSize || 'A4');
	if (isNeedSwapPageSizes(pageOrientation)) { // swap page sizes
		size = { width: size.height, height: size.width };
	}
	size.orientation = size.width > size.height ? 'landscape' : 'portrait';
	return size;
}

function fixPageMargins(margin) {
	if (isNumber(margin)) {
		margin = { left: margin, right: margin, top: margin, bottom: margin };
	} else if (isArray(margin)) {
		if (margin.length === 2) {
			margin = { left: margin[0], top: margin[1], right: margin[0], bottom: margin[1] };
		} else if (margin.length === 4) {
			margin = { left: margin[0], top: margin[1], right: margin[2], bottom: margin[3] };
		} else {
			throw 'Invalid pageMargins definition';
		}
	}

	return margin;
}

function registerDefaultTableLayouts(layoutBuilder) {
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
	if (isString(pageSize)) {
		var size = sizes[pageSize.toUpperCase()];
		if (!size) {
			throw 'Page size ' + pageSize + ' not recognized';
		}
		return { width: size[0], height: size[1] };
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

function renderPages(pages, fontProvider, pdfKitDoc, patterns, progressCallback) {
	pdfKitDoc._pdfMakePages = pages;
	pdfKitDoc.addPage();

	var totalItems = 0;
	if (progressCallback) {
		pages.forEach(function (page) {
			totalItems += page.items.length;
		});
	}

	var renderedItems = 0;
	progressCallback = progressCallback || function () {
	};

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
					renderVector(item.item, patterns, pdfKitDoc);
					break;
				case 'line':
					renderLine(item.item, item.item.x, item.item.y, patterns, pdfKitDoc);
					break;
				case 'image':
					renderImage(item.item, item.item.x, item.item.y, pdfKitDoc);
					break;
				case 'svg':
					renderSVG(item.item, item.item.x, item.item.y, pdfKitDoc, fontProvider);
					break;
				case 'beginClip':
					beginClip(item.item, pdfKitDoc);
					break;
				case 'endClip':
					endClip(pdfKitDoc);
					break;
				case 'beginVerticalAlign':
					beginVerticalAlign(item.item, pdfKitDoc);
					break;
				case 'endVerticalAlign':
					endVerticalAlign(item.item, pdfKitDoc);
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

/**
 * Shift the "y" height of the text baseline up or down (superscript or subscript,
 * respectively). The exact shift can / should be changed according to standard
 * conventions.
 *
 * @param {number} y
 * @param {any} inline
 */
function offsetText(y, inline) {
	var newY = y;
	if (inline.sup) {
		newY -= inline.fontSize * 0.75;
	}
	if (inline.sub) {
		newY += inline.fontSize * 0.35;
	}
	return newY;
}

function renderLine(line, x, y, patterns, pdfKitDoc) {
	function preparePageNodeRefLine(_pageNodeRef, inline) {
		var newWidth;
		var diffWidth;
		var textTools = new TextTools(null);

		if (isUndefined(_pageNodeRef.positions)) {
			throw 'Page reference id not found';
		}

		var pageNumber = _pageNodeRef.positions[0].pageNumber.toString();

		inline.text = pageNumber;
		newWidth = textTools.widthOfString(inline.text, inline.font, inline.fontSize, inline.characterSpacing, inline.fontFeatures);
		diffWidth = inline.width - newWidth;
		inline.width = newWidth;

		switch (inline.alignment) {
			case 'right':
				inline.x += diffWidth;
				break;
			case 'center':
				inline.x += diffWidth / 2;
				break;
		}
	}

	if (line._pageNodeRef) {
		preparePageNodeRefLine(line._pageNodeRef, line.inlines[0]);
	}

	if (line._tocItemNode) {
		preparePageNodeRefLine(line._tocItemNode, line.inlines[0]);
	}

	x = x || 0;
	y = y || 0;

	var lineHeight = line.getHeight();
	var ascenderHeight = line.getAscenderHeight();
	var descent = lineHeight - ascenderHeight;

	textDecorator.drawBackground(line, x, y, patterns, pdfKitDoc);

	//TODO: line.optimizeInlines();
	for (var i = 0, l = line.inlines.length; i < l; i++) {
		var inline = line.inlines[i];
		var shiftToBaseline = lineHeight - ((inline.font.ascender / 1000) * inline.fontSize) - descent;

		if (inline._pageNodeRef) {
			preparePageNodeRefLine(inline._pageNodeRef, inline);
		}

		if (inline._tocItemNode) {
			preparePageNodeRefLine(inline._tocItemNode, inline);
		}

		var options = {
			lineBreak: false,
			textWidth: inline.width,
			characterSpacing: inline.characterSpacing,
			wordCount: 1,
			link: inline.link
		};

		if (inline.linkToDestination) {
			options.goTo = inline.linkToDestination;
		}

		if (line.id && i === 0) {
			options.destination = line.id;
		}

		if (inline.fontFeatures) {
			options.features = inline.fontFeatures;
		}

		var opacity = isNumber(inline.opacity) ? inline.opacity : 1;
		pdfKitDoc.opacity(opacity);
		pdfKitDoc.fill(inline.color || 'black');

		pdfKitDoc._font = inline.font;
		pdfKitDoc.fontSize(inline.fontSize);

		var shiftedY = offsetText(y + shiftToBaseline, inline);
		pdfKitDoc.text(inline.text, x + inline.x, shiftedY, options);

		if (inline.linkToPage) {
			pdfKitDoc.ref({ Type: 'Action', S: 'GoTo', D: [inline.linkToPage, 0, 0] }).end();
			pdfKitDoc.annotate(x + inline.x, shiftedY, inline.width, inline.height, {
				Subtype: 'Link',
				Dest: [inline.linkToPage - 1, 'XYZ', null, null, null]
			});
		}

	}
	// Decorations won't draw correctly for superscript
	textDecorator.drawDecorations(line, x, y, pdfKitDoc);
}

function renderWatermark(page, pdfKitDoc) {
	var watermark = page.watermark;

	pdfKitDoc.fill(watermark.color);
	pdfKitDoc.opacity(watermark.opacity);

	pdfKitDoc.save();

	pdfKitDoc.rotate(watermark.angle, { origin: [pdfKitDoc.page.width / 2, pdfKitDoc.page.height / 2] });

	var x = pdfKitDoc.page.width / 2 - watermark._size.size.width / 2;
	var y = pdfKitDoc.page.height / 2 - watermark._size.size.height / 2;

	pdfKitDoc._font = watermark.font;
	pdfKitDoc.fontSize(watermark.fontSize);
	pdfKitDoc.text(watermark.text, x, y, { lineBreak: false });

	pdfKitDoc.restore();
}

function renderVector(vector, patterns, pdfKitDoc) {
	//TODO: pdf optimization (there's no need to write all properties everytime)
	pdfKitDoc.lineWidth(vector.lineWidth || 1);
	if (vector.dash) {
		pdfKitDoc.dash(vector.dash.length, { space: vector.dash.space || vector.dash.length, phase: vector.dash.phase || 0 });
	} else {
		pdfKitDoc.undash();
	}
	pdfKitDoc.lineJoin(vector.lineJoin || 'miter');
	pdfKitDoc.lineCap(vector.lineCap || 'butt');

	//TODO: clipping

	var gradient = null;

	switch (vector.type) {
		case 'ellipse':
			pdfKitDoc.ellipse(vector.x, vector.y, vector.r1, vector.r2);

			if (vector.linearGradient) {
				gradient = pdfKitDoc.linearGradient(vector.x - vector.r1, vector.y, vector.x + vector.r1, vector.y);
			}
			break;
		case 'rect':
			if (vector.r) {
				pdfKitDoc.roundedRect(vector.x, vector.y, vector.w, vector.h, vector.r);
			} else {
				pdfKitDoc.rect(vector.x, vector.y, vector.w, vector.h);
			}

			if (vector.linearGradient) {
				gradient = pdfKitDoc.linearGradient(vector.x, vector.y, vector.x + vector.w, vector.y);
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

	if (vector.linearGradient && gradient) {
		var step = 1 / (vector.linearGradient.length - 1);

		for (var i = 0; i < vector.linearGradient.length; i++) {
			gradient.stop(i * step, vector.linearGradient[i]);
		}

		vector.color = gradient;
	}

	if (isPattern(vector.color)) {
		vector.color = getPattern(vector.color, patterns);
	}

	var fillOpacity = isNumber(vector.fillOpacity) ? vector.fillOpacity : 1;
	var strokeOpacity = isNumber(vector.strokeOpacity) ? vector.strokeOpacity : 1;

	if (vector.color && vector.lineColor) {
		pdfKitDoc.fillColor(vector.color, fillOpacity);
		pdfKitDoc.strokeColor(vector.lineColor, strokeOpacity);
		pdfKitDoc.fillAndStroke();
	} else if (vector.color) {
		pdfKitDoc.fillColor(vector.color, fillOpacity);
		pdfKitDoc.fill();
	} else {
		pdfKitDoc.strokeColor(vector.lineColor || 'black', strokeOpacity);
		pdfKitDoc.stroke();
	}
}

function renderImage(image, x, y, pdfKitDoc) {
	var opacity = isNumber(image.opacity) ? image.opacity : 1;
	pdfKitDoc.opacity(opacity);
	if (image.cover) {
		var align = image.cover.align || 'center';
		var valign = image.cover.valign || 'center';
		var width = image.cover.width ? image.cover.width : image.width;
		var height = image.cover.height ? image.cover.height : image.height;
		pdfKitDoc.save();
		pdfKitDoc.rect(image.x, image.y, width, height).clip();
		pdfKitDoc.image(image.image, image.x, image.y, { cover: [width, height], align: align, valign: valign });
		pdfKitDoc.restore();
	} else {
		pdfKitDoc.image(image.image, image.x, image.y, { width: image._width, height: image._height });
	}
	if (image.link) {
		pdfKitDoc.link(image.x, image.y, image._width, image._height, image.link);
	}
	if (image.linkToPage) {
		pdfKitDoc.ref({ Type: 'Action', S: 'GoTo', D: [image.linkToPage, 0, 0] }).end();
		pdfKitDoc.annotate(image.x, image.y, image._width, image._height, { Subtype: 'Link', Dest: [image.linkToPage - 1, 'XYZ', null, null, null] });
	}
	if (image.linkToDestination) {
		pdfKitDoc.goTo(image.x, image.y, image._width, image._height, image.linkToDestination);
	}
}

function beginVerticalAlign(item, pdfKitDoc) {
	switch (item.verticalAlign) {
		case 'center':
			pdfKitDoc.save();
			pdfKitDoc.translate(0, -(item.nodeHeight - item.viewHeight) / 2);
			break;
		case 'bottom':
			pdfKitDoc.save();
			pdfKitDoc.translate(0, -(item.nodeHeight - item.viewHeight));
			break;
	}
}

function endVerticalAlign(item, pdfKitDoc) {
	switch (item.verticalAlign) {
		case 'center':
		case 'bottom':
			pdfKitDoc.restore();
			break;
	}
}

function renderSVG(svg, x, y, pdfKitDoc, fontProvider) {
	var options = Object.assign({ width: svg._width, height: svg._height, assumePt: true }, svg.options);
	options.fontCallback = function (family, bold, italic) {
		var fontsFamily = family.split(',').map(function (f) { return f.trim().replace(/('|")/g, ''); });
		var font = findFont(fontProvider.fonts, fontsFamily, svg.font || 'Roboto');

		var fontFile = fontProvider.getFontFile(font, bold, italic);
		if (fontFile === null) {
			var type = fontProvider.getFontType(bold, italic);
			throw new Error('Font \'' + font + '\' in style \'' + type + '\' is not defined in the font section of the document definition.');
		}

		return fontFile;
	};

	SVGtoPDF(pdfKitDoc, svg.svg, svg.x, svg.y, options);

	if (svg.link) {
		pdfKitDoc.link(svg.x, svg.y, svg._width, svg._height, svg.link);
	}
	if (svg.linkToPage) {
		pdfKitDoc.ref({Type: 'Action', S: 'GoTo', D: [svg.linkToPage, 0, 0]}).end();
		pdfKitDoc.annotate(svg.x, svg.y, svg._width, svg._height, { Subtype: 'Link', Dest: [svg.linkToPage - 1, 'XYZ', null, null, null] });
	}
	if (svg.linkToDestination) {
		pdfKitDoc.goTo(svg.x, svg.y, svg._width, svg._height, svg.linkToDestination);
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

function createPatterns(patternDefinitions, pdfKitDoc) {
	var patterns = {};
	Object.keys(patternDefinitions).forEach(function (p) {
		var pattern = patternDefinitions[p];
		patterns[p] = pdfKitDoc.pattern(pattern.boundingBox, pattern.xStep, pattern.yStep, pattern.pattern, pattern.colored);
	});
	return patterns;
}

function resolveRemoteImages(docDefinition, timeoutMs) {
	if (!docDefinition || typeof docDefinition !== 'object') {
		return Promise.resolve();
	}

	if (docDefinition[REMOTE_RESOLVED_KEY]) {
		return Promise.resolve();
	}

	docDefinition.images = docDefinition.images || {};
	var images = docDefinition.images;
	var remoteTargets = new Map();
	var cache = this._remoteImageCache || (this._remoteImageCache = new Map());

	Object.keys(images).forEach(function (key) {
		var descriptor = parseRemoteDescriptor(images[key]);
		if (descriptor) {
			remoteTargets.set(key, descriptor);
		}
	});

	collectInlineImages(docDefinition.content, remoteTargets, images);

	if (remoteTargets.size === 0) {
		markRemoteResolved(docDefinition);
		return Promise.resolve();
	}

	var timeout = typeof timeoutMs === 'number' && timeoutMs > 0 ? timeoutMs : undefined;
	var tasks = [];

	remoteTargets.forEach(function (descriptor, key) {
		var cacheKey = createCacheKey(descriptor.url, descriptor.headers);
		tasks.push(
			ensureRemoteBuffer(descriptor.url, descriptor.headers, cacheKey, cache, timeout)
				.then(function (buffer) {
					images[key] = buffer;
				})
				.catch(function () {
					if (TRANSPARENT_PNG_PLACEHOLDER) {
						images[key] = Buffer.from(TRANSPARENT_PNG_PLACEHOLDER);
					} else {
						delete images[key];
					}
				})
		);
	});

	var self = this;
	return Promise.all(tasks).then(function () {
		markRemoteResolved(docDefinition);
		return self;
	});
}

function collectInlineImages(node, remoteTargets, images) {
	if (!node) {
		return;
	}

	if (Array.isArray(node)) {
		node.forEach(function (item) {
			collectInlineImages(item, remoteTargets, images);
		});
		return;
	}

	if (typeof node !== 'object') {
		return;
	}

	if (node.image) {
		var resolvedKey = registerInlineImage(node, images);
		if (resolvedKey) {
			var descriptor = parseRemoteDescriptor(images[resolvedKey]);
			if (descriptor) {
				remoteTargets.set(resolvedKey, descriptor);
			}
		}
	}

	Object.keys(node).forEach(function (prop) {
		if (prop === 'image' || prop.charAt(0) === '_') {
			return;
		}
		collectInlineImages(node[prop], remoteTargets, images);
	});
}

function registerInlineImage(node, images) {
	var value = node.image;
	if (typeof value === 'string') {
		if (isRemoteUrl(value)) {
			if (!images[value]) {
				images[value] = value;
			}
			node.image = value;
			return value;
		}

		var existing = images[value];
		if (existing) {
			var descriptor = parseRemoteDescriptor(existing);
			if (descriptor) {
				return value;
			}
		}
	} else if (value && typeof value === 'object') {
		if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(value)) {
			return null;
		}

		if (typeof Uint8Array !== 'undefined' && value instanceof Uint8Array) {
			node.image = typeof Buffer !== 'undefined' ? Buffer.from(value) : value;
			return null;
		}

		if (value.type === 'Buffer' && Array.isArray(value.data)) {
			node.image = typeof Buffer !== 'undefined' ? Buffer.from(value.data) : value.data;
			return null;
		}

		var url = value.url;
		if (typeof url === 'string' && isRemoteUrl(url)) {
			var key = url;
			if (!images[key]) {
				images[key] = value;
			}
			node.image = key;
			return key;
		}
	}

	return null;
}

function ensureRemoteBuffer(url, headers, cacheKey, cache, timeout) {
	var existing = cache.get(cacheKey);
	if (existing) {
		return Promise.resolve(existing);
	}

	return fetchRemote(url, headers, timeout).then(function (buffer) {
		cache.set(cacheKey, buffer);
		return buffer;
	});
}

function parseRemoteDescriptor(value) {
	if (!value) {
		return null;
	}

	if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(value)) {
		return null;
	}

	if (typeof Uint8Array !== 'undefined' && value instanceof Uint8Array) {
		return null;
	}

	if (typeof value === 'string') {
		if (isRemoteUrl(value)) {
			return { url: value, headers: {} };
		}
		return null;
	}

	if (typeof value === 'object') {
		if (typeof value.url === 'string' && isRemoteUrl(value.url)) {
			return { url: value.url, headers: value.headers || {} };
		}
	}

	return null;
}

function isRemoteUrl(value) {
	return typeof value === 'string' && REMOTE_PROTOCOL_REGEX.test(value) && !DATA_URL_REGEX.test(value);
}

function createCacheKey(url, headers) {
	var normalizedHeaders = {};
	if (headers && typeof headers === 'object') {
		Object.keys(headers).sort().forEach(function (key) {
			normalizedHeaders[key.toLowerCase()] = headers[key];
		});
	}

	return url + '::' + JSON.stringify(normalizedHeaders);
}

function markRemoteResolved(docDefinition) {
	try {
		Object.defineProperty(docDefinition, REMOTE_RESOLVED_KEY, {
			value: true,
			enumerable: false,
			configurable: true,
			writable: true
		});
	} catch (error) {
		void error;
		docDefinition[REMOTE_RESOLVED_KEY] = true;
	}
}

function fetchRemote(url, headers, timeoutMs) {
	if (typeof fetch === 'function') {
		return fetchWithGlobal(url, headers, timeoutMs);
	}

	return fetchWithNode(url, headers, timeoutMs);
}

function fetchWithGlobal(url, headers, timeoutMs) {
	var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
	var timer = null;
	var options = { headers: headers || {} };
	if (controller) {
		options.signal = controller.signal;
	}

	if (controller && timeoutMs) {
		timer = setTimeout(function () {
			controller.abort();
		}, timeoutMs);
	}

	return fetch(url, options).then(function (response) {
		if (timer) {
			clearTimeout(timer);
		}

		if (!response.ok) {
			var statusText = response.statusText || 'Unknown error';
			throw new Error('Failed to fetch remote image (' + response.status + ' ' + statusText + ')');
		}

		return response.arrayBuffer();
	}).then(function (buffer) {
		return typeof Buffer !== 'undefined' ? Buffer.from(buffer) : buffer;
	});
}

function fetchWithNode(url, headers, timeoutMs) {
	return new Promise(function (resolve, reject) {
		var parsedUrl;
		try {
			parsedUrl = new URL(url);
		} catch (err) {
			reject(err);
			return;
		}

		var transport = parsedUrl.protocol === 'https:' ? require('https') : require('http');
		var requestOptions = {
			protocol: parsedUrl.protocol,
			hostname: parsedUrl.hostname,
			port: parsedUrl.port,
			path: parsedUrl.pathname + (parsedUrl.search || ''),
			method: 'GET',
			headers: headers || {}
		};

		var timeoutTriggered = false;
		var req = transport.request(requestOptions, function (res) {
			if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
				var redirectUrl = new URL(res.headers.location, parsedUrl);
				res.resume();
				fetchWithNode(redirectUrl.toString(), headers, timeoutMs).then(resolve, reject);
				return;
			}

			if (res.statusCode < 200 || res.statusCode >= 300) {
				reject(new Error('Failed to fetch remote image (' + res.statusCode + ')'));
				res.resume();
				return;
			}

			var chunks = [];
			res.on('data', function (chunk) {
				chunks.push(chunk);
			});
			res.on('end', function () {
				if (timeoutTriggered) {
					return;
				}
				resolve(Buffer.concat(chunks));
			});
		});

		req.on('error', function (err) {
			if (timeoutTriggered) {
				return;
			}
			reject(err);
		});

		if (timeoutMs) {
			req.setTimeout(timeoutMs, function () {
				timeoutTriggered = true;
				req.abort();
				reject(new Error('Remote image request timed out'));
			});
		}

		req.end();
	});
}

module.exports = PdfPrinter;

/* temporary browser extension */
PdfPrinter.prototype.fs = require('fs');
