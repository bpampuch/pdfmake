var fonts = {
	Roboto: {
		normal: 'fonts/Roboto-Regular.ttf',
		bold: 'fonts/Roboto-Medium.ttf',
		italics: 'fonts/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto-Italic.ttf'
	}
};

var PdfPrinter = require('pdfmake');
var printer = new PdfPrinter(fonts);


var docDefinition = {
	content: [
		'Paragraph 1',
		'Paragraph 2'
	],
	/*
	styles: {
		header: {
			fontSize: 20,
		}
	},
	defaultStyle: {
	}*/
};

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.write('bootstrap.pdf');
