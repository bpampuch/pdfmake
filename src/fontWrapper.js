/* jslint node: true */
'use strict';

var _ = require('lodash');

function FontWrapper(pdfkitDoc, path, fontName){
	this.MAX_CHAR_TYPES = 92;

	this.pdfkitDoc = pdfkitDoc;
	this.path = path;
	this.pdfFonts = [];
	this.charCatalogue = [];
	this.name = fontName;

  Object.defineProperty(this, 'ascender', {
    get: function () {
      var font = this.getFont(0);
      return font.ascender;
    }
  });
  Object.defineProperty(this, 'decender', {
    get: function () {
      var font = this.getFont(0);
      return font.decender;
    }
  });

}
// private

FontWrapper.prototype.getFont = function(index){
	if(!this.pdfFonts[index]){

		var pseudoName = this.name + index;

		if(this.postscriptName){
			delete this.pdfkitDoc._fontFamilies[this.postscriptName];
		}

		this.pdfFonts[index] = this.pdfkitDoc.font(this.path, pseudoName)._font;
		if(!this.postscriptName){
			this.postscriptName = this.pdfFonts[index].name;
		}
	}

	return this.pdfFonts[index];
};

// public
FontWrapper.prototype.widthOfString = function(){
	var font = this.getFont(0);
	return font.widthOfString.apply(font, arguments);
};

FontWrapper.prototype.lineHeight = function(){
	var font = this.getFont(0);
	return font.lineHeight.apply(font, arguments);
};

FontWrapper.prototype.ref = function(){
	var font = this.getFont(0);
	return font.ref.apply(font, arguments);
};

var toCharCode = function(char){
  return char.charCodeAt(0);
};

FontWrapper.prototype.encode = function(text){
  var self = this;

  var charTypesInInline = _.chain(text.split('')).map(toCharCode).uniq().value();
	if (charTypesInInline.length > self.MAX_CHAR_TYPES) {
		throw new Error('Inline has more than '+ self.MAX_CHAR_TYPES + ': ' + text + ' different character types and therefore cannot be properly embedded into pdf.');
	}


  var characterFitInFontWithIndex = function (charCatalogue) {
    return _.uniq(charCatalogue.concat(charTypesInInline)).length <= self.MAX_CHAR_TYPES;
  };

  var index = _.findIndex(self.charCatalogue, characterFitInFontWithIndex);

  if(index < 0){
    index = self.charCatalogue.length;
    self.charCatalogue[index] = [];
  }

	var font = self.getFont(index);
	font.use(text);

  _.each(charTypesInInline, function(charCode){
    if(!_.includes(self.charCatalogue[index], charCode)){
      self.charCatalogue[index].push(charCode);
    }
  });

  var encodedText = _.map(font.encode(text), function (char) {
    return char.charCodeAt(0).toString(16);
  }).join('');

  return {
    encodedText: encodedText,
    fontId: font.id
  };
};


module.exports = FontWrapper;
