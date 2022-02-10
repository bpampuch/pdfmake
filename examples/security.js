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
	//userPassword: '123',
	ownerPassword: '123456',
	permissions: {
		printing: 'highResolution', //'lowResolution'
		modifying: false,
		copying: false,
		annotating: true,
		fillingForms: true,
		contentAccessibility: true,
		documentAssembly: true
	},
	content: [
		'Document content with security',
		'For details see to source or documentation.'
	]
};

var now = new Date();

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/security.pdf'));
pdfDoc.end();

console.log(new Date() - now);
