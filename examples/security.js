var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

var docDefinition = {
	//userPassword: '123',
	ownerPassword: '123456',
	permissions: {
		printing: 'highResolution', //'lowResolution'
		modifying: false,
		copying: false,
		annotating: true,
		fillingForms: true,
		contentAccessibility: true,
		documentAssembly: true
	},
	content: [
		'Document content with security',
		'For details see to source or documentation.'
	]
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/security.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
