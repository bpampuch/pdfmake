import PdfKit from 'pdfkit';

function getEngineInstance() {
	return PdfKit;
}

function createPdfDocument(options = {}) {
	return new PdfKit(options);
}

export default {
	getEngineInstance: getEngineInstance,
	createPdfDocument: createPdfDocument
};
