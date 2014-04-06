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
		'pdfmake (since it\'s based on pdfkit) supports JPEG and PNG format',
		'If no width/height/fit is provided, image original size will be used',
		{
			image: 'fonts/sampleImage.jpg',
		},
		'If you specify width, image will scale proportionally',
		{
			image: 'fonts/sampleImage.jpg',
			width: 150
		},
		'If you specify both width and height - image will be stretched',
		{
			image: 'fonts/sampleImage.jpg',
			width: 150,
			height: 150,
		},
		'You can also fit the image inside a rectangle',
		{
			image: 'fonts/sampleImage.jpg',
			fit: [100, 100]
		}
	]
};

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/images.pdf'));
pdfDoc.end();
