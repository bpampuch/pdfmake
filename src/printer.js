/* jslint node: true */
/* global window */
'use strict';

var _ = require('lodash');
var FontProvider = require('./fontProvider');
var LayoutBuilder = require('./layoutBuilder');
var PdfKit = require('pdfkit');
var PDFReference = require('pdfkit/js/reference');
var sizes = require('./standardPageSizes');
var ImageMeasure = require('./imageMeasure');
var textDecorator = require('./textDecorator');
var FontProvider = require('./fontProvider');

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
 * pdfDoc.pipe(fs.createWriteStream('sample.pdf'));
 * pdfDoc.end();
 *
 * @return {Object} a pdfKit document object which can be saved or encode to data-url
 */
PdfPrinter.prototype.createPdfKitDocument = function(docDefinition, options) {
	options = options || {};

	var pageSize = pageSize2widthAndHeight(docDefinition.pageSize || 'a4');

  if(docDefinition.pageOrientation === 'landscape') {
    pageSize = { width: pageSize.height, height: pageSize.width};
  }
	pageSize.orientation = docDefinition.pageOrientation === 'landscape' ? docDefinition.pageOrientation : 'portrait';

	this.pdfKitDoc = new PdfKit({ size: [ pageSize.width, pageSize.height ], compress: false});
	this.pdfKitDoc.info.Producer = 'pdfmake';
	this.pdfKitDoc.info.Creator = 'pdfmake';
	this.fontProvider = new FontProvider(this.fontDescriptors, this.pdfKitDoc);

  docDefinition.images = docDefinition.images || {};

	var builder = new LayoutBuilder(
		pageSize,
		fixPageMargins(docDefinition.pageMargins || 40),
        new ImageMeasure(this.pdfKitDoc, docDefinition.images));

  registerDefaultTableLayouts(builder);
  if (options.tableLayouts) {
    builder.registerTableLayouts(options.tableLayouts);
  }

	var pages = builder.layoutDocument(docDefinition.content, this.fontProvider, docDefinition.styles || {}, docDefinition.defaultStyle || { fontSize: 12, font: 'Roboto' }, docDefinition.background, docDefinition.header, docDefinition.footer, docDefinition.images, docDefinition.watermark, docDefinition.pageBreakBefore);

	renderPages(pages, this.fontProvider, this.pdfKitDoc);

	if(options.autoPrint){
        var jsRef = this.pdfKitDoc.ref({
			S: 'JavaScript',
			JS: new StringObject('this.print\\(true\\);')
		});
		var namesRef = this.pdfKitDoc.ref({
			Names: [new StringObject('EmbeddedJS'), new PDFReference(this.pdfKitDoc, jsRef.id)],
		});

		jsRef.end();
		namesRef.end();

		this.pdfKitDoc._root.data.Names = {
			JavaScript: new PDFReference(this.pdfKitDoc, namesRef.id)
		};
	}
	return this.pdfKitDoc;
};

function fixPageMargins(margin) {
    if (!margin) return null;

    if (typeof margin === 'number' || margin instanceof Number) {
        margin = { left: margin, right: margin, top: margin, bottom: margin };
    } else if (margin instanceof Array) {
        if (margin.length === 2) {
            margin = { left: margin[0], top: margin[1], right: margin[0], bottom: margin[1] };
        } else if (margin.length === 4) {
            margin = { left: margin[0], top: margin[1], right: margin[2], bottom: margin[3] };
        } else throw 'Invalid pageMargins definition';
    }

    return margin;
}

function registerDefaultTableLayouts(layoutBuilder) {
  layoutBuilder.registerTableLayouts({
    noBorders: {
      hLineWidth: function(i) { return 0; },
      vLineWidth: function(i) { return 0; },
      paddingLeft: function(i) { return i && 4 || 0; },
      paddingRight: function(i, node) { return (i < node.table.widths.length - 1) ? 4 : 0; },
    },
    headerLineOnly: {
      hLineWidth: function(i, node) {
        if (i === 0 || i === node.table.body.length) return 0;
        return (i === node.table.headerRows) ? 2 : 0;
      },
      vLineWidth: function(i) { return 0; },
      paddingLeft: function(i) {
        return i === 0 ? 0 : 8;
      },
      paddingRight: function(i, node) {
        return (i === node.table.widths.length - 1) ? 0 : 8;
      }
    },
    lightHorizontalLines: {
      hLineWidth: function(i, node) {
        if (i === 0 || i === node.table.body.length) return 0;
        return (i === node.table.headerRows) ? 2 : 1;
      },
      vLineWidth: function(i) { return 0; },
      hLineColor: function(i) { return i === 1 ? 'black' : '#aaa'; },
      paddingLeft: function(i) {
        return i === 0 ? 0 : 8;
      },
      paddingRight: function(i, node) {
        return (i === node.table.widths.length - 1) ? 0 : 8;
      }
    }
  });
}

var defaultLayout = {
  hLineWidth: function(i, node) { return 1; }, //return node.table.headerRows && i === node.table.headerRows && 3 || 0; },
  vLineWidth: function(i, node) { return 1; },
  hLineColor: function(i, node) { return 'black'; },
  vLineColor: function(i, node) { return 'black'; },
  paddingLeft: function(i, node) { return 4; }, //i && 4 || 0; },
  paddingRight: function(i, node) { return 4; }, //(i < node.table.widths.length - 1) ? 4 : 0; },
  paddingTop: function(i, node) { return 2; },
  paddingBottom: function(i, node) { return 2; }
};

function pageSize2widthAndHeight(pageSize) {
    if (typeof pageSize == 'string' || pageSize instanceof String) {
        var size = sizes[pageSize.toUpperCase()];
        if (!size) throw ('Page size ' + pageSize + ' not recognized');
        return { width: size[0], height: size[1] };
    }

    return pageSize;
}

function StringObject(str){
	this.isString = true;
	this.toString = function(){
		return str;
	};
}

function updatePageOrientationInOptions(currentPage, pdfKitDoc) {
	var previousPageOrientation = pdfKitDoc.options.size[0] > pdfKitDoc.options.size[1] ? 'landscape' : 'portrait';

	if(currentPage.pageSize.orientation !== previousPageOrientation) {
		var width = pdfKitDoc.options.size[0];
		var height = pdfKitDoc.options.size[1];
		pdfKitDoc.options.size = [height, width];
	}
}

function renderPages(pages, fontProvider, pdfKitDoc) {
  pdfKitDoc._pdfMakePages = pages;
	for (var i = 0; i < pages.length; i++) {
		if (i > 0) {
			updatePageOrientationInOptions(pages[i], pdfKitDoc);
			pdfKitDoc.addPage(pdfKitDoc.options);
		}

		var page = pages[i];
    for(var ii = 0, il = page.items.length; ii < il; ii++) {
        var item = page.items[ii];
        switch(item.type) {
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
    }
    if(page.watermark){
      renderWatermark(page, pdfKitDoc);
	}

    fontProvider.setFontRefsToPdfDoc();
  }
}

function renderLine(line, x, y, pdfKitDoc) {
	x = x || 0;
	y = y || 0;

	var ascenderHeight = line.getAscenderHeight();

	textDecorator.drawBackground(line, x, y, pdfKitDoc);

	//TODO: line.optimizeInlines();
	for(var i = 0, l = line.inlines.length; i < l; i++) {
		var inline = line.inlines[i];

		pdfKitDoc.fill(inline.color || 'black');

		pdfKitDoc.save();
		pdfKitDoc.transform(1, 0, 0, -1, 0, pdfKitDoc.page.height);


    var encoded = inline.font.encode(inline.text);
		pdfKitDoc.addContent('BT');

		pdfKitDoc.addContent('' + (x + inline.x) + ' ' + (pdfKitDoc.page.height - y - ascenderHeight) + ' Td');
		pdfKitDoc.addContent('/' + encoded.fontId + ' ' + inline.fontSize + ' Tf');

        pdfKitDoc.addContent('<' + encoded.encodedText + '> Tj');

		pdfKitDoc.addContent('ET');
		pdfKitDoc.restore();
	}

	textDecorator.drawDecorations(line, x, y, pdfKitDoc);

}

function renderWatermark(page, pdfKitDoc){
	var watermark = page.watermark;

	pdfKitDoc.fill('black');
	pdfKitDoc.opacity(0.6);

	pdfKitDoc.save();
	pdfKitDoc.transform(1, 0, 0, -1, 0, pdfKitDoc.page.height);

	var angle = Math.atan2(pdfKitDoc.page.height, pdfKitDoc.page.width) * 180/Math.PI;
	pdfKitDoc.rotate(angle, {origin: [pdfKitDoc.page.width/2, pdfKitDoc.page.height/2]});

  var encoded = watermark.font.encode(watermark.text);
	pdfKitDoc.addContent('BT');
	pdfKitDoc.addContent('' + (pdfKitDoc.page.width/2 - watermark.size.size.width/2) + ' ' + (pdfKitDoc.page.height/2 - watermark.size.size.height/4) + ' Td');
	pdfKitDoc.addContent('/' + encoded.fontId + ' ' + watermark.size.fontSize + ' Tf');
	pdfKitDoc.addContent('<' + encoded.encodedText + '> Tj');
	pdfKitDoc.addContent('ET');
	pdfKitDoc.restore();
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

function renderImage(image, x, y, pdfKitDoc) {
    pdfKitDoc.image(image.image, image.x, image.y, { width: image._width, height: image._height });
}

module.exports = PdfPrinter;


/* temporary browser extension */
PdfPrinter.prototype.fs = require('fs');
