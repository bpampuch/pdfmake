var fonts = {
	Roboto: {
		normal: 'fonts/Roboto-Regular.ttf',
		bold: 'fonts/Roboto-Medium.ttf',
		italics: 'fonts/Roboto-Italic.ttf',
		bolditalics: 'fonts/Roboto-MediumItalic.ttf'
	}
};

var pdfMake = require('../js/pdfMake');
pdfMake.addFonts(fonts);

var docDefinition = {
	content: [
		'First paragraph',
		'Another paragraph, this time a little bit longer to make sure, this line will be divided into at least two lines'
	]
};

var now = new Date();

var pdf = pdfMake.createPdf(docDefinition);
pdf.write('pdfs/basics.pdf');

console.log(new Date() - now);
