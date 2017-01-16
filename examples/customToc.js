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
		{'Custom TOC: Custom location and custom title'},
		{
			toc:
				{
					title: 'Index'
				}
		},
		{text: 'Unordered list', style: 'header', tocItem: true},
		{
			ol: [
				'item 1',
				'item 2',
				'item 3',
			]
		},
		{text: '\n\nUnordered list with longer lines', style: 'header', tocItem: true},
		{
			ol: [
				'item 1',
				'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Malit profecta versatur nomine ocurreret multavit',
				'item 3',
			]
		}
	],
	styles: {
		header: {
			bold: true,
			fontSize: 15
		}
	},
	defaultStyle: {
		fontSize: 12,
	}

};

var now = new Date();
var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/lists.pdf'));
pdfDoc.end();

console.log(new Date() - now);
