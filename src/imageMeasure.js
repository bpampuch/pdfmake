'use strict';

var fs = require('fs');

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

	var imageSize = { width: image.width, height: image.height };

	// If EXIF orientation calls for it, swap width and height
	if (image.orientation > 4) {
		imageSize = { width: image.height, height: image.width };
	}

	return imageSize;

	function realImageSrc(src) {
		var img = that.imageDictionary[src];

		if (!img) {
			return src;
		}

		if (typeof img === 'object') {
			throw 'Not supported image definition: ' + JSON.stringify(img);
		}

		if (fs.existsSync(img)) {
			return fs.readFileSync(img);
		}

		var index = img.indexOf('base64,');
		if (index < 0) {
			return that.imageDictionary[src];
		}

		return Buffer.from(img.substring(index + 7), 'base64');
	}
};

module.exports = ImageMeasure;
