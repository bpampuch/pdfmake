var fonts = {
	Roboto: {
		normal: 'fonts/Roboto-Regular.ttf',
		bold: 'fonts/Roboto-Medium.ttf',
		italics: 'fonts/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto-MediumItalic.ttf'
	}
};

var PdfPrinter = require('../src/printer');
var printer = new PdfPrinter(fonts);
var fs = require('fs');

var docDefinition = {
	version: '1.5', // PDF version
	subset: 'PDF/A-3a', // Subset types: // PDF/A-1, PDF/A-1a, PDF/A-1b, PDF/A-2, PDF/A-2a, PDF/A-2b, PDF/A-3, PDF/A-3a, PDF/A-3b, PDF/UA
	tagged: true, // Mark document as Tagged PDF
	displayTitle: true, // Display of document title in window title
	info: {
		title: 'Awesome PDF document from pdfmake'
	},
	content: [
		'PDF/A document for archive'
	]
};

var now = new Date();
var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/pdfa.pdf'));
pdfDoc.end();

console.log(new Date() - now);
