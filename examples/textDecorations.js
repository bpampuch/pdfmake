var path = require("path");

function mp(relFontPath) {
	return path.resolve(__dirname, relFontPath)
}

var fonts = {
	Roboto: {
		normal: mp('./fonts/Roboto-Regular.ttf'),
		bold: mp('./fonts/Roboto-Medium.ttf'),
		italics: mp('./fonts/Roboto-Italic.ttf'),
		bolditalics: mp('./fonts/Roboto-MediumItalic.ttf')
	}
};

var pdfmake = require('../js/index');
pdfmake.setFonts(fonts);

var ct = [];
var lorem = 'Lorem ipsum dolor sit amet';

ct.push({ text: 'Higlighted text', fontSize: 18, background: 'yellow' });
ct.push(' ');
ct.push({
	columns: [
		{ text: 'Underline decoration', decoration: 'underline' },
		{ text: 'Line Through decoration', decoration: 'lineThrough' },
		{ text: 'Overline decoration', decoration: 'overline' }
	]
});
ct.push(' ');
ct.push({
	columns: [
		{ text: 'Dashed style', decoration: 'underline', decorationStyle: 'dashed' },
		{ text: 'Dotted style', decoration: 'underline', decorationStyle: 'dotted' },
		{ text: 'Double style', decoration: 'underline', decorationStyle: 'double' },
		{ text: 'Wavy style', decoration: 'underline', decorationStyle: 'wavy' }
	]
});
ct.push(' ')
ct.push({
	columns: [
		{ text: 'Using colors', decoration: 'underline', decorationColor: 'blue' },
		{ text: 'Using colors', decoration: 'lineThrough', decorationColor: 'red' },
		{ text: 'Using colors', decoration: 'underline', decorationStyle: 'wavy', decorationColor: 'green' }
	]
});



var docDefinition = {
	content: ct
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/textDecorations.pdf');

console.log(new Date() - now);
