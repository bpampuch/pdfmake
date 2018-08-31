var PdfKit = require('pdfkit');

function getEngineInstance() {
	return PdfKit;
}

function createPdfDocument(options = {}) {
	return new PdfKit(options);
}

module.exports = {
	getEngineInstance: getEngineInstance,
	createPdfDocument: createPdfDocument
};