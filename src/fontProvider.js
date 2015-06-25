/* jslint node: true */
'use strict';

var _ = require('lodash');
var FontWrapper = require('./fontWrapper');

function typeName(bold, italics){
	var type = 'normal';
	if (bold && italics) type = 'bolditalics';
	else if (bold) type = 'bold';
	else if (italics) type = 'italics';
	return type;
}

function FontProvider(fontDescriptors, pdfDoc) {
	this.fonts = {};
	this.pdfDoc = pdfDoc;
	this.fontWrappers = {};

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
	var type = typeName(bold, italics);
  if (!this.fonts[familyName] || !this.fonts[familyName][type]) {
		throw new Error('Font \''+ familyName + '\' in style \''+type+ '\' is not defined in the font section of the document definition.');
	}

  this.fontWrappers[familyName] = this.fontWrappers[familyName] || {};

  if (!this.fontWrappers[familyName][type]) {
		this.fontWrappers[familyName][type] = new FontWrapper(this.pdfDoc, this.fonts[familyName][type], familyName + '(' + type + ')');
	}

  return this.fontWrappers[familyName][type];
};

FontProvider.prototype.setFontRefsToPdfDoc = function(){
  var self = this;

  _.each(self.fontWrappers, function(fontFamily) {
    _.each(fontFamily, function(fontWrapper){
      _.each(fontWrapper.pdfFonts, function(font){
        if (!self.pdfDoc.page.fonts[font.id]) {
          self.pdfDoc.page.fonts[font.id] = font.ref();
        }
      });
    });
  });
};

module.exports = FontProvider;
