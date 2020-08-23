var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Courier = require('../standard-fonts/Courier');
pdfmake.addFonts(Courier);

var Helvetica = require('../standard-fonts/Helvetica');
pdfmake.addFonts(Helvetica);

var Times = require('../standard-fonts/Times');
pdfmake.addFonts(Times);

//var Symbol = require('../standard-fonts/Symbol');
//pdfmake.addFonts(Symbol);

//var ZapfDingbats = require('../standard-fonts/ZapfDingbats');
//pdfmake.addFonts(ZapfDingbats);


var docDefinition = {
	content: [
		{ text: 'Standard fonts supports only ANSI code page (only english characters)!', bold: true },
		' ',
		{ text: 'Courier font', font: 'Courier' },
		{ text: 'Helvetica font', font: 'Helvetica' },
		{ text: 'Times font', font: 'Times' },
		//{ text: 'Symbol font', font: 'Symbol' },
		//{ text: 'ZapfDingbats font', font: 'ZapfDingbats' },

	],
	defaultStyle: {
		font: 'Helvetica'
	}
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/standardfonts.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
