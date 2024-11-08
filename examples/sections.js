var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

var docDefinition = {
	header: function () { return 'default header'; },
	footer: function () { return 'default footer'; },
	content: [
		{
			section: [
				'SECTION 1',
				'Text in section.'
			]
		},
		{
			header: function (currentPage, pageCount) { return 'header: ' + currentPage.toString() + ' of ' + pageCount; },
			footer: function (currentPage, pageCount) { return 'footer: ' + currentPage.toString() + ' of ' + pageCount; },
			pageOrientation: 'landscape',
			section: [
				'SECTION 2',
				'Text in section as landscape page.'
			]
		},
		{
			header: null,
			footer: null,

			pageSize: 'A7',
			pageOrientation: 'portrait',
			section: [
				'SECTION 3',
				'Text in section as A7 page.'
			]
		},
		{
			pageSize: 'A6',
			pageOrientation: 'portrait',
			pageMargins: 5,
			section: [
				'SECTION 4',
				'Text in section as A6 page with margin.'
			]
		},
		{
			pageSize: 'A6',
			pageOrientation: 'landscape',
			pageMargins: 10,
			section: [
				'SECTION 5',
				'Text in section as A6 landscape page with margin.'
			]
		},
		{
			pageSize: 'inherit',
			pageOrientation: 'inherit',
			pageMargins: 'inherit',
			section: [
				'SECTION 7',
				'Text in section with page definition as previous page. Page size, orientation and margins are inherited.'
			]
		},
		{
			header: function (currentPage, pageCount) { return 'header in section 8: ' + currentPage.toString() + ' of ' + pageCount; },
			footer: function (currentPage, pageCount) { return 'footer in section 8: ' + currentPage.toString() + ' of ' + pageCount; },
			section: [
				'SECTION 8',
				'Text in section with page definition as defined in document.'
			]
		}
	]
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/sections.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
