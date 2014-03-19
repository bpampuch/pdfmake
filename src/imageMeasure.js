var pdfKit = require('pdfkit');

function ImageMeasure(pdfDoc) {
	this.pdfDoc = pdfDoc;
}

ImageMeasure.prototype.measureImage = function(src) {
	var image, label;

	if (!this.pdfDoc._imageRegistry[src]) {
		image = pdfKit.PDFImage.open(src);
		label = "I" + (++this.pdfDoc._imageCount);
		this.pdfDoc._imageRegistry[src] = [image, label, []];
	} else {
		image = this.pdfDoc._imageRegistry[src][0];
	}

	return { width: image.width, height: image.height };
};

module.exports = ImageMeasure;
