'use strict';

function ImageMeasure(pdfKitDoc, imageDictionary) {
	this.pdfKitDoc = pdfKitDoc;
	this.imageDictionary = imageDictionary || {};
}

ImageMeasure.prototype.measureImage = function (src) {
	var image;
	var that = this;

	if (!this.pdfKitDoc._imageRegistry[src]) {
		try {
			image = this.pdfKitDoc.openImage(realImageSrc(src));
			if (!image) {
				throw 'No image';
			}
		} catch (error) {
			throw 'Invalid image: ' + error.toString() + '\nImages dictionary should contain dataURL entries (or local file paths in node.js)';
		}
		image.embed(this.pdfKitDoc);
		this.pdfKitDoc._imageRegistry[src] = image;
	} else {
		image = this.pdfKitDoc._imageRegistry[src];
	}

	return { width: image.width, height: image.height };

	function realImageSrc(src) {
		var img = that.imageDictionary[src];

		if (!img) {
			return src;
		}

		var index = img.indexOf('base64,');
		if (index < 0) {
			return that.imageDictionary[src];
		}

		return Buffer.from(img.substring(index + 7), 'base64');
	}
};

module.exports = ImageMeasure;
