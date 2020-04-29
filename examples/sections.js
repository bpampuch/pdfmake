var fonts = {
	Roboto: {
		normal: 'fonts/Roboto-Regular.ttf',
		bold: 'fonts/Roboto-Medium.ttf',
		italics: 'fonts/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto-MediumItalic.ttf'
	}
};

var pdfmake = require('../js/index');
pdfmake.setFonts(fonts);

var docDefinition = {
	content: [
		{
			section: [
				'SECTION 1',
				'Text in section.'
			]
		},
		{
			pageOrientation: 'landscape',
			section: [
				'SECTION 2',
				'Text in section as landscape page.'
			]
		},
		{
			pageSize: 'A7',
			pageOrientation: 'portrait',
			section: [
				'SECTION 4',
				'Text in section as A7 page.'
			]
		},
		{
			pageSize: 'A6',
			pageOrientation: 'portrait',
			pageMargins: 5,
			section: [
				'SECTION 5',
				'Text in section as A6 page with margin.'
			]
		},
		{
			pageSize: 'A6',
			pageOrientation: 'landscape',
			pageMargins: 5,
			section: [
				'SECTION 6',
				'Text in section as A6 landscape page with margin.'
			]
		}
	]
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/sections.pdf');

console.log(new Date() - now);
