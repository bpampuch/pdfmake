var fonts = {
	Roboto: {
		normal: 'fonts/Roboto-Regular.ttf',
		bold: 'fonts/Roboto-Medium.ttf',
		italics: 'fonts/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto-Italic.ttf'
	}
};

var PdfPrinter = require('../src/printer');
var printer = new PdfPrinter(fonts);


var docDefinition = {
	content: [
		{ 
			text: 'This paragraph uses header style and extends the alignment property', 
			style: 'header', 
			alignment: 'center' 
		},
		{ 
			text: 'This paragraph uses header style and overrides bold value setting it back to false', 
			style: 'header', 
			bold: false 
		}
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true
		}
	},
};

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.write('pdfs/named_styles_plus_overrides.pdf');
