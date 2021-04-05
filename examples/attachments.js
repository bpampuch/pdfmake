var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

var docDefinition = {
	content: [
		'First paragraph',
		{
			attachment: 'test',
			filename: 'test.txt',
		},
		'Second paragraph',
	]
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/attachments.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
