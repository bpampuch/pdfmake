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
			text: [
				'This ',
				{text: 'is', color: 'green'},
				' the first ',
				{text: 'paragraph', color: 'red'}
			]
		},
		{
			canvas: [
				{
					type: 'rect',
					x: 0,
					y: 0,
					w: 310,
					h: 260,
					r: 5,
					dash: {length: 5},
					// lineWidth: 10,
					lineColor: 'blue',
				},
				{
					type: 'rect',
					x: 1,
					y: 1,
					w: 308,
					h: 258,
					r: 4,
					lineColor: 'red',
					color: '#ffffe0',
				},
				{
					type: 'polyline',
					lineWidth: 3,
					closePath: true,
					points: [{x: 10, y: 10}, {x: 35, y: 40}, {x: 100, y: 40}, {x: 125, y: 10}]
				},
				{
					type: 'polyline',
					lineWidth: 2,
					color: 'blue',
					lineColor: 'red',
					points: [{x: 10, y: 110}, {x: 35, y: 140}, {x: 100, y: 140}, {x: 125, y: 110}, {x: 10, y: 110}]
				},
				{
					type: 'line',
					x1: 40, y1: 60,
					x2: 260, y2: 60,
					lineWidth: 3
				},
				{
					type: 'ellipse',
					x: 150, y: 140,
					color: 'red',
					fillOpacity: 0.5,
					r1: 80, r2: 60
				},
				{
					type: 'rect',
					x: 150,
					y: 200,
					w: 150,
					h: 50,
				},
				{
					type: 'rect',
					x: 10, y: 200, w: 100, h: 10,
					linearGradient: ['red', 'blue']
				},
				{
					type: 'rect',
					x: 10, y: 215, w: 100, h: 10,
					linearGradient: ['red', 'green', 'blue']
				},
				{
					type: 'rect',
					x: 10, y: 230, w: 100, h: 10,
					linearGradient: ['red', 'yellow', 'green', 'blue']
				}
			]
		},
		'This text should be rendered under canvas',
		{
			color: 'black',

			text: [
				'This should be black ',
			]
		}
	],
	defaultStyle: {
		color: 'gray',
	}
};

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/vectors.pdf'));
pdfDoc.end();
