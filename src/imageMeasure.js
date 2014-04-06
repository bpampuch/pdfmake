var pdfKit = require('pdfmake-pdfkit');

function ImageMeasure(pdfDoc) {
	this.pdfDoc = pdfDoc;
}

ImageMeasure.prototype.measureImage = function(src) {
	var image, label;

	if (!this.pdfDoc._imageRegistry[src]) {
		label = "I" + (++this.pdfDoc._imageCount);
		image = pdfKit.PDFImage.open(src, label);
		image.embed(this.pdfDoc);
		this.pdfDoc._imageRegistry[src] = image;
	} else {
		image = this.pdfDoc._imageRegistry[src];
	}

	return { width: image.width, height: image.height };
};

module.exports = ImageMeasure;
