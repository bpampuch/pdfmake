'use strict';

var isArray = require('./helpers').isArray;

function typeName(bold, italics) {
	var type = 'normal';
	if (bold && italics) {
		type = 'bolditalics';
	} else if (bold) {
		type = 'bold';
	} else if (italics) {
		type = 'italics';
	}
	return type;
}

function FontProvider(fontDescriptors, pdfKitDoc) {
	this.fonts = {};
	this.pdfKitDoc = pdfKitDoc;
	this.fontCache = {};

	for (var font in fontDescriptors) {
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

FontProvider.prototype.getFontType = function (bold, italics) {
	return typeName(bold, italics);
};

FontProvider.prototype.getFontFile = function (familyName, bold, italics) {
	var type = this.getFontType(bold, italics);
	if (!this.fonts[familyName] || !this.fonts[familyName][type]) {
		return null;
	}

	return this.fonts[familyName][type];
};

FontProvider.prototype.provideFont = function (familyName, bold, italics) {
	var type = this.getFontType(bold, italics);
	if (this.getFontFile(familyName, bold, italics) === null) {
		throw new Error('Font \'' + familyName + '\' in style \'' + type + '\' is not defined in the font section of the document definition.');
	}

	this.fontCache[familyName] = this.fontCache[familyName] || {};

	if (!this.fontCache[familyName][type]) {
		var def = this.fonts[familyName][type];
		if (!isArray(def)) {
			def = [def];
		}
		this.fontCache[familyName][type] = this.pdfKitDoc.font.apply(this.pdfKitDoc, def)._font;
	}

	return this.fontCache[familyName][type];
};

module.exports = FontProvider;
