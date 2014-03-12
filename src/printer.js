/* jslint node: true */
'use strict';

var LayoutBuilder = require('./layoutBuilder');
var PdfKit = require('pdfkit');

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
 *		bolditalics: 'fonts/Roboto-Italic.ttf'
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
 * @param {Object} docDefinition.pageMargins.left
 * @param {Object} docDefinition.pageMargins.top
 * @param {Object} docDefinition.pageMargins.right
 * @param {Object} docDefinition.pageMargins.bottom
 *
 * @example
 *
 * var docDefinition = {
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
 * var pdfDoc = printer.createPdfKitDocument(docDefinition);
 *
 * pdfDoc.write('sample.pdf');
 *
 * @return {Object} a pdfKit document object which can be saved or encode to data-url
 */
PdfPrinter.prototype.createPdfKitDocument = function(docDefinition, options) {
	options = options || {};

	var pageSize = docDefinition.pageSize || { width: 595.28, height: 841.89 };
	this.pdfKitDoc = new PdfKit({ size: [ pageSize.width, pageSize.height ]});
	this.pdfKitDoc.info.Producer = 'pdfmake';
	this.pdfKitDoc.info.Creator = 'pdfmake';
	this.fontProvider = new FontProvider(this.fontDescriptors, this.pdfKitDoc);

	var builder = new LayoutBuilder(
		pageSize,
		docDefinition.pageMargins || { left: 40, top: 40, bottom: 40, right: 40 });

	var pages = builder.layoutDocument(docDefinition.content, this.fontProvider, docDefinition.styles || {}, docDefinition.defaultStyle || { fontSize: 12, font: 'Roboto' });

	renderPages(pages, this.fontProvider, this.pdfKitDoc);

	if(options.autoPrint){
		var PDFReference = this.pdfKitDoc.store.objects[2].constructor;
		var jsRef = this.pdfKitDoc.ref({
			S: 'JavaScript',
			JS: new StringObject('this.print\\(true\\);')
		});
		var namesRef = this.pdfKitDoc.ref({
			Names: [new StringObject('EmbeddedJS'), new PDFReference(jsRef.id)],
		});
		this.pdfKitDoc.store.objects[2].data.Names = { JavaScript: new PDFReference(namesRef.id) };
	}
	return this.pdfKitDoc;
};

function StringObject(str){
	this.isString = true;
	this.toString = function(){
		return str;
	};
}

function renderPages(pages, fontProvider, pdfKitDoc) {
	for(var i = 0, l = pages.length; i < l; i++) {
		if (i > 0) {
			pdfKitDoc.addPage();
		}

		setFontRefs(fontProvider, pdfKitDoc);

		var page = pages[i];
		for(var vi = 0, vl = page.vectors.length; vi < vl; vi++) {
			var vector = page.vectors[vi];
			renderVector(vector, pdfKitDoc);
		}
		for(var li = 0, ll = page.lines.length; li < ll; li++) {
			var line = page.lines[li];
			renderLine(line, line.x, line.y, pdfKitDoc);
		}
	}
}

function setFontRefs(fontProvider, pdfKitDoc) {
	for(var fontName in fontProvider.cache) {
		var desc = fontProvider.cache[fontName];

		for (var fontType in desc) {
			var font = desc[fontType];
			var _ref, _base, _name;

			if (!(_ref = (_base = pdfKitDoc.page.fonts)[_name = font.id])) {
				_base[_name] = font.ref;
			}
		}
	}
}

function renderLine(line, x, y, pdfKitDoc) {
	x = x || 0;
	y = y || 0;

	var ascenderHeight = line.getAscenderHeight();
	var lineHeight = line.getHeight();

	//TODO: line.optimizeInlines();
	for(var i = 0, l = line.inlines.length; i < l; i++) {
		var inline = line.inlines[i];

		pdfKitDoc.fill(inline.color || 'black');

		pdfKitDoc.save();
		pdfKitDoc.transform(1, 0, 0, -1, 0, pdfKitDoc.page.height);

		pdfKitDoc.addContent('BT');
		var a = (inline.font.ascender / 1000 * inline.fontSize);

		pdfKitDoc.addContent('' + (x + inline.x) + ' ' + (pdfKitDoc.page.height - y - ascenderHeight) + ' Td');
		pdfKitDoc.addContent('/' + inline.font.id + ' ' + inline.fontSize + ' Tf');

		pdfKitDoc.addContent('<' + encode(inline.font, inline.text) + '> Tj');

		pdfKitDoc.addContent('ET');
		pdfKitDoc.restore();
	}
}

function encode(font, text) {
	font.use(text);

	text = font.encode(text);
	text = ((function() {
		var _results = [];

		for (var i = 0, _ref2 = text.length; 0 <= _ref2 ? i < _ref2 : i > _ref2; 0 <= _ref2 ? i++ : i--) {
			_results.push(text.charCodeAt(i).toString(16));
		}
		return _results;
	})()).join('');

	return text;
}

function renderVector(vector, pdfDoc) {
	//TODO: pdf optimization (there's no need to write all properties everytime)
	pdfDoc.lineWidth(vector.lineWidth || 1);
	if (vector.dash) {
		pdfDoc.dash(vector.dash.length, { space: vector.dash.space || vector.dash.length });
	} else {
		pdfDoc.undash();
	}
	pdfDoc.fillOpacity(vector.fillOpacity || 1);
	pdfDoc.strokeOpacity(vector.strokeOpacity || 1);
	pdfDoc.lineJoin(vector.lineJoin || 'miter');

	//TODO: clipping

	switch(vector.type) {
		case 'ellipse':
			pdfDoc.ellipse(vector.x, vector.y, vector.r1, vector.r2);
			break;
		case 'rect':
			if (vector.r) {
				pdfDoc.roundedRect(vector.x, vector.y, vector.w, vector.h, vector.r);
			} else {
				pdfDoc.rect(vector.x, vector.y, vector.w, vector.h);
			}
			break;
		case 'line':
			pdfDoc.moveTo(vector.x1, vector.y1);
			pdfDoc.lineTo(vector.x2, vector.y2);
			break;
		case 'polyline':
			if (vector.points.length === 0) break;

			pdfDoc.moveTo(vector.points[0].x, vector.points[0].y);
			for(var i = 1, l = vector.points.length; i < l; i++) {
				pdfDoc.lineTo(vector.points[i].x, vector.points[i].y);
			}

			if (vector.points.length > 1) {
				var p1 = vector.points[0];
				var pn = vector.points[vector.points.length - 1];

				if (vector.closePath || p1.x === pn.x && p1.y === pn.y) {
					pdfDoc.closePath();
				}
			}
			break;
	}

	if (vector.color && vector.lineColor) {
		pdfDoc.fillAndStroke(vector.color, vector.lineColor);
	} else if (vector.color) {
		pdfDoc.fill(vector.color);
	} else {
		pdfDoc.stroke(vector.lineColor || 'black');
	}
}

function FontProvider(fontDescriptors, pdfDoc) {
	this.fonts = {};
	this.pdfDoc = pdfDoc;
	this.cache = {};

	for(var font in fontDescriptors) {
		if (fontDescriptors.hasOwnProperty(font)) {
			var fontDef = fontDescriptors[font];

			this.fonts[font] = {
				normal: fontDef.normal,
				bold: fontDef.bold,
				italics: fontDef.italics,
				bolditalics: fontDef.bolditalics
			};
		}
	}
}

FontProvider.prototype.provideFont = function(familyName, bold, italics) {
	if (!this.fonts[familyName]) return this.pdfDoc._font;

	var type = 'normal';

	if (bold && italics) type = 'bolditalics';
	else if (bold) type = 'bold';
	else if (italics) type = 'italics';

	if (!this.cache[familyName]) this.cache[familyName] = {};

	var cached = this.cache[familyName] && this.cache[familyName][type];

	if (cached) return cached;

	var fontCache = (this.cache[familyName] = this.cache[familyName] || {});
	fontCache[type] = this.pdfDoc.font(this.fonts[familyName][type])._font;
	return fontCache[type];
};

module.exports = PdfPrinter;


/* temporary browser extension */
PdfPrinter.prototype.fs = require('fs');
