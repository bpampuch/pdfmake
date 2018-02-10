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
		},
		'\n\nFor preserving leading spaces use preserveLeadingSpaces property:',
		{text: '    This is a paragraph with preserved leading spaces.', preserveLeadingSpaces: true},
		{text: '{', preserveLeadingSpaces: true},
		{text: '    "sample": {', preserveLeadingSpaces: true},
		{text: '        "json": "nested"', preserveLeadingSpaces: true},
		{text: '    }', preserveLeadingSpaces: true},
		{text: '}', preserveLeadingSpaces: true},
		'\n\nfontFeatures property:',
		{text: 'Hello World 1234567890', fontFeatures: ['smcp']},
		{text: 'Hello World 1234567890', fontFeatures: ['c2sc']},
		{text: 'Hello World 1234567890', fontFeatures: ['onum']},
		{text: 'Hello World 1234567890', fontFeatures: ['onum', 'c2sc']}
	]
};

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/styling_properties.pdf'));
pdfDoc.end();
