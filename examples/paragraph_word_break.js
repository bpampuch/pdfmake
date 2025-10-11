var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);

// or you can define the font manually:
/*
pdfmake.addFonts({
	Roboto: {
		normal: '../fonts/Roboto/Roboto-Regular.ttf',
		bold: '../fonts/Roboto/Roboto-Medium.ttf',
		italics: '../fonts/Roboto/Roboto-Italic.ttf',
		bolditalics: '../fonts/Roboto/Roboto-MediumItalic.ttf'
	}
});var docDefinition = {

*/

var docDefinition = {
	content: [
		{
			text: 'DefaultLine\n"BreakBehaviour" "ForATextWithVeryVery" "LongLongWords"',
			fontSize: 30,
		},
		{
			text: '\n\n',
			fontSize: 30,
		},
		{
			text: 'BreakAll\n"LineBreakBehaviour" "ForATextWithVeryVery" "LongLongWords"',
			fontSize: 30,
			wordBreak: 'break-all',	
		}
	]
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/paragraph_word_break.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
