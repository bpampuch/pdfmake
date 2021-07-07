var pdfmake = require('../js/index'); // only during development, otherwise use the following line
//var pdfmake = require('pdfmake');

var Roboto = require('../fonts/Roboto');
pdfmake.addFonts(Roboto);


var ct = [];

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
ct.push(' ');
ct.push({
	columns: [
		{ text: 'Using colors', decoration: 'underline', decorationColor: 'blue' },
		{ text: 'Using colors', decoration: 'lineThrough', decorationColor: 'red' },
		{ text: 'Using colors', decoration: 'underline', decorationStyle: 'wavy', decorationColor: 'green' }
	]
});
ct.push(' ');
ct.push({
	columns: [
		{ text: 'Stroke width 3', decoration: 'underline', decorationColor: 'blue', decorationStrokeWidth: 3, decorationStyle: 'dashed' },
		{ text: 'Stroke width 5', decoration: 'underline', decorationColor: 'red', decorationStrokeWidth: 5, decorationStyle: 'dotted' },
		{ text: 'Stroke width 2', decoration: 'underline', decorationColor: 'purple', decorationStrokeWidth: 2, decorationStyle: 'wavy' },
		{ text: 'Stroke width 2', decoration: 'underline', decorationColor: 'black', decorationStrokeWidth: 2, decorationStyle: 'double' },
		{ text: 'Stroke width 2', decoration: 'lineThrough', decorationColor: 'grey', decorationStrokeWidth: 2 }
	]
});



var docDefinition = {
	content: ct
};

var now = new Date();

var pdf = pdfmake.createPdf(docDefinition);
pdf.write('pdfs/textDecorations.pdf').then(() => {
	console.log(new Date() - now);
}, err => {
	console.error(err);
});
