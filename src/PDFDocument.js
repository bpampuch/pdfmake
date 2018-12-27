import PDFKit from 'pdfkit';

class PDFDocument extends PDFKit {
	constructor(options = {}) {
		super(options);
	}
}

export default PDFDocument;
