/* jslint node: true */
'use strict';

var PDFImage = require('pdfkit/js/image');

function ImageMeasure(pdfKitDoc, imageDictionary) {
	this.pdfKitDoc = pdfKitDoc;
	this.imageDictionary = imageDictionary || {};
}

ImageMeasure.prototype.measureImage = function (src) {
	var image, label;
	var that = this;

	if (!this.pdfKitDoc._imageRegistry[src]) {
		label = 'I' + (++this.pdfKitDoc._imageCount);
		try {
			image = PDFImage.open(realImageSrc(src), label);
		} catch (error) {
			image = null;
		}
		if (image === null || image === undefined) {
			throw 'invalid image, images dictionary should contain dataURL entries (or local file paths in node.js)';
		}
		image.embed(this.pdfKitDoc);
		this.pdfKitDoc._imageRegistry[src] = image;
	} else {
		image = this.pdfKitDoc._imageRegistry[src];
	}

	return {width: image.width, height: image.height};

	function realImageSrc(src) {
		var img = that.imageDictionary[src];

		if (!img) {
			return src;
		}

		var index = img.indexOf('base64,');
		if (index < 0) {
			return that.imageDictionary[src];
		}

		return new Buffer(img.substring(index + 7), 'base64');
	}
};

module.exports = ImageMeasure;
