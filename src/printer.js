(function PdfPrinter() {
	'use strict';

	function printer(layout, PdfKit) {

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
			this.pdfKitDoc = new PdfKit();
			this.fontProvider = new FontProvider(fontDescriptors, this.pdfKitDoc);
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
		PdfPrinter.prototype.createPdfKitDocument = function(docDefinition) {
			var builder = new layout.LayoutBuilder(
				docDefinition.pageSize || { width: 595.28, height: 741.89 },
				docDefinition.pageMargins || { left: 40, top: 40, bottom: 40, right: 40 });

			var pages = builder.layoutDocument(docDefinition.content, this.fontProvider, docDefinition.styles || {}, docDefinition.defaultStyle || { fontSize: 12, font: 'Roboto' });

			renderPages(pages, this.fontProvider, this.pdfKitDoc);
			return this.pdfKitDoc;
		};

		function renderPages(pages, fontProvider, pdfKitDoc) {
			for(var i = 0, l = pages.length; i < l; i++) {
				if (i > 0) {
					pdfKitDoc.addPage();
				}

				setFontRefs(fontProvider, pdfKitDoc);

				var page = pages[i];
				for(var li = 0, ll = page.lines.length; li < ll; li++) {
					var line = page.lines[li];
					renderLine(line, line.x, line.y, pdfKitDoc);
				}
				for(var vi = 0, vl = page.vectors.length; vi < vl; vi++) {
					var vector = page.vectors[vi];
					renderVector(vector, pdfKitDoc);
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

		function renderBlock(block, pdfKitDoc) {
			var x = block.x || 0,
				y = block.y || 0,
				yOffset = 0;

			for(var i = 0, l = block.lines.length; i < l; i++) {
				var line = block.lines[i];
				renderLine(line, x + line.x, y + yOffset, pdfKitDoc);
				yOffset += line.getHeight();
			}
		}

		function renderLine(line, x, y, pdfKitDoc) {
			x = x || 0;
			y = y || 0;

			//TODO: line.optimizeInlines();

			for(var i = 0, l = line.inlines.length; i < l; i++) {
				var inline = line.inlines[i];

				pdfKitDoc.save();
				pdfKitDoc.transform(1, 0, 0, -1, 0, pdfKitDoc.page.height);

				pdfKitDoc.addContent('BT');
				pdfKitDoc.addContent('' + (x + inline.x) + ' ' + (pdfKitDoc.page.height - y - line.getHeight()) + ' Td');
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
			switch(vector.type) {
				case 'ellipse':
					pdfDoc.fillAndStroke(vector.outlineColor || vector.color || 'black', vector.color || 'black');
					pdfDoc.lineWidth(vector.outlineWidth || 0);
					pdfDoc.ellipse(vector.x, vector.y, vector.r1, vector.r2);
					pdfDoc.fill();
				break;
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

		return PdfPrinter;
	}

	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
		module.exports = printer(require('./layout'), require('pdfkit'));
	}
	else {
		if (typeof define === 'function' && define.amd) {
			define(['layout', 'pdfkit'], function(layout, pdfkit) {
				return printer(layout, pdfkit);
			});
		} else {
			if(!window.PDFMake.layout) {
				throw 'PDFMake.layout not found';
			}
			if(!window.PDFMake.pdfkit) {
				throw 'PDFMake.pdfkit not found';
			}

			window.PDFMake.Printer = printer(window.PDFMake.layout, window.PDFMake.pdfkit);
		}
	}
})();
