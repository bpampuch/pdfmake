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
pdf.write('pdfs/security.pdf');

console.log(new Date() - now);
