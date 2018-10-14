import { isArray } from './helpers/variableType';
import PDFKit from 'pdfkit';

const typeName = function (bold, italics) {
	let type = 'normal';
	if (bold && italics) {
		type = 'bolditalics';
	} else if (bold) {
		type = 'bold';
	} else if (italics) {
		type = 'italics';
	}
	return type;
};

class PDFDocument extends PDFKit {

	constructor(fonts, options = {}) {
		super(options);
		this.fonts = {};
		this.fontCache = {};

		for (let font in fonts) {
			if (fonts.hasOwnProperty(font)) {
				let fontDef = fonts[font];

				this.fonts[font] = {
					normal: fontDef.normal,
					bold: fontDef.bold,
					italics: fontDef.italics,
					bolditalics: fontDef.bolditalics
				};
			}
		}
	}

	provideFont(familyName, bold, italics) {
		let type = typeName(bold, italics);
		if (!this.fonts[familyName] || !this.fonts[familyName][type]) {
			throw new Error(`Font '${familyName}' in style '${type}' is not defined in the font section of the document definition.`);
		}

		this.fontCache[familyName] = this.fontCache[familyName] || {};

		if (!this.fontCache[familyName][type]) {
			let def = this.fonts[familyName][type];
			if (!isArray(def)) {
				def = [def];
			}
			this.fontCache[familyName][type] = this.pdfKitDoc.font(...def)._font;
		}

		return this.fontCache[familyName][type];
	}

}

export default PDFDocument;
