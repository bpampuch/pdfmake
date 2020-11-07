var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);


// Note that the used encryption depends on the used PDF version.
// By default the old PDF version 1.3 is used. The encryption for this version is RC4 40-bit which is known to be weak.
// For more information and options visit the pdfkit documentation:
// https://github.com/foliojs/pdfkit/blob/master/docs/getting_started.md#encryption-and-access-privileges
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
