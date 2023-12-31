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
			text: 'This is a header (whole paragraph uses the same header style)\n\n',
			style: 'header'
		},
		{
			text: [
				'It is however possible to provide an array of texts ',
				'to the paragraph (instead of a single string) and have ',
				{ text: 'a better ', fontSize: 15, bold: true },
				'control over it. \nEach inline can be ',
				{ text: 'styled ', fontSize: 20 },
				{ text: 'independently ', italics: true, fontSize: 40 },
				'then.\n\n'
			]
		},
		{ text: 'Mixing named styles and style-overrides', style: 'header' },
		{
			style: 'bigger',
			italics: false,
			text: [
				'We can also mix named-styles and style-overrides at both paragraph and inline level. ',
				'For example, this paragraph uses the "bigger" style, which changes fontSize to 15 and sets italics to true. ',
				'Texts are not italics though. It\'s because we\'ve overriden italics back to false at ',
				'the paragraph level. \n\n',
				'We can also change the style of a single inline. Let\'s use a named style called header: ',
				{ text: 'like here.\n', style: 'header' },
				'It got bigger and bold.\n\n',
				'OK, now we\'re going to mix named styles and style-overrides at the inline level. ',
				'We\'ll use header style (it makes texts bigger and bold), but we\'ll override ',
				'bold back to false: ',
				{ text: 'wow! it works!', style: 'header', bold: false },
				'\n\nMake sure to take a look into the sources to understand what\'s going on here.'
			]
		}
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true
		},
		bigger: {
			fontSize: 15,
			italics: true
		}
	},
	language: "en-AU"
};

var pdfDoc = printer.createPdfKitDocument(docDefinition);
pdfDoc.pipe(fs.createWriteStream('pdfs/styling_inlines.pdf'));
pdfDoc.end();
