/* jslint node: true */
'use strict';

var pdfKit = require('pdfkit');
var PDFImage = require('pdfkit/js/image');

function ImageMeasure(pdfDoc, imageDictionary) {
	this.pdfDoc = pdfDoc;
	this.imageDictionary = imageDictionary || {};
}

ImageMeasure.prototype.measureImage = function(src) {
	var image, label;
	var that = this;

	if (!this.pdfDoc._imageRegistry[src]) {
		label = 'I' + (++this.pdfDoc._imageCount);
		image = PDFImage.open(realImageSrc(src), label);
		image.embed(this.pdfDoc);
		this.pdfDoc._imageRegistry[src] = image;
	} else {
		image = this.pdfDoc._imageRegistry[src];
	}

	return { width: image.width, height: image.height };

	function realImageSrc(src) {
		var img = that.imageDictionary[src];

		if (!img) return src;

		var index = img.indexOf('base64,');
		if (index < 0) {
			throw 'invalid image format, images dictionary should contain dataURL entries';
		}

		return new Buffer(img.substring(index + 7), 'base64');
	}
};

module.exports = ImageMeasure;
