'use strict';

class ImageMeasure {
	constructor(pdfKitDoc, imageDictionary) {
		this.pdfKitDoc = pdfKitDoc;
		this.imageDictionary = imageDictionary || {};
	}

	measureImage(src) {
		let image;
		const that = this;

		if (!this.pdfKitDoc._imageRegistry[src]) {
			try {
				image = this.pdfKitDoc.openImage(realImageSrc(src));
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
			const img = that.imageDictionary[src];

			if (!img) {
				return src;
			}

			const index = img.indexOf('base64,');
			if (index < 0) {
				return that.imageDictionary[src];
			}

			return Buffer.from(img.substring(index + 7), 'base64');
		}
	}
}

module.exports = ImageMeasure;
