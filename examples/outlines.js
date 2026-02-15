var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

var docDefinition = {
	content: [
		{
			text: 'Outlines / Bookmarks',
			style: 'header',
		},
		{
			text: 'Text elements marked with outline: true will be added to outlines/bookmarks. See below.',
			pageBreak: 'after'
		},
		{
			text: 'First header in bookmarks',
			outline: true,
			style: 'header',
			pageBreak: 'after'
		},
		{
			text: 'Second header with custom bookmark',
			outline: true,
			outlineText: 'Custom bookmark text',
			style: 'header',
			pageBreak: 'after'
		},
		{
			text: 'Structured bookmarks',
			id: 'structured-bookmarks',
			outline: true,
			outlineExpanded: true,
			style: 'header',
			pageBreak: 'after'
		},
		{
			text: 'First subheader',
			outline: true,
			outlineParentId: 'structured-bookmarks',
			style: 'subheader',
			pageBreak: 'after'
		},
		{
			text: 'Second subheader',
			outline: true,
			outlineParentId: 'structured-bookmarks',
			style: 'subheader',
			pageBreak: 'after'
		},
		{
			text: 'Third subheader',
			outline: true,
			outlineParentId: 'structured-bookmarks',
			id: 'third-subheader',
			style: 'subheader',
			pageBreak: 'after'
		},
		{
			text: 'Sub subheader',
			outline: true,
			outlineParentId: 'third-subheader',
			id: 'sub-subheader',
			style: 'subheader',
			pageBreak: 'after'
		},
		{
			text: 'Sub sub subheader',
			outline: true,
			outlineParentId: 'sub-subheader',
			style: 'subheader',
			pageBreak: 'after'
		}
	],
	styles: {
		header: {
			fontSize: 18,
			bold: true
		},
		subheader: {
			fontSize: 15,
			bold: true
		}
	}
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/outlines.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
