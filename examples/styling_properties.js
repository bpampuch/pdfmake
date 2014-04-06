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
var fs = require('fs');


var docDefinition = {
	content: [
		{
			text: 'Paragraphs can also by styled without using named-styles (this one sets fontSize to 25)',
			fontSize: 25
		},
		'Another paragraph, using default style, this time a little bit longer to make sure, this line will be divided into at least two lines\n\n',
		{
			text: 'This paragraph does not use a named-style and sets fontSize to 8 and italics to true',
			fontSize: 8,
			italics: true
		}
	]
};

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/styling_properties.pdf'));
pdfDoc.end();
